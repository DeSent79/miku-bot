import Discord, { Message } from 'discord.js';
import * as logger from './modules/logger';
import { SettingsModel, Settings, Track, TrackModel } from './models';
import https from 'https';
import path from 'path';
import fs from 'fs';
import { randomInt } from 'crypto';
import { generateRandomString, removeArrayElement, shuffleArray } from './modules/utils';

function defaultMongoErrorHandler (err: Error): void {
	logger.out('Fatal error: connection to mongo failed, exiting...', 'mongo');
	logger.error('Failed to connect to DB.', err, 'mongo');
	setImmediate(() => process.exit(1));
}

export class MikuBot extends Discord.Client {

	private connections: {[serverId: string]: Discord.VoiceConnection} = {};
	private voiceChannels: {[serverId: string]: Discord.VoiceChannel} = {};
	private nowPlays: {[serverId: string]: Track} = {};
	private isInRandomMode: {[serverId: string]: boolean} = {};
	private randomQueues: {[serverId: string]: Track[]} = {};
	private settings: Settings;
	private initialized: boolean = false;
	private tracksDir: string;

	constructor (token: string, tracksDir: string) {
		super();

		this.tracksDir = tracksDir;

		SettingsModel.findOne({}).then(async (settingsDoc) => {
			let settings = settingsDoc as Settings;

			if (!settings) {
				settings = (new SettingsModel()) as Settings;
				await settings.save();
			}

			this.settings = settings;
			this.init();

		}, (err) => defaultMongoErrorHandler(err));

		this.on('ready', () => {
			logger.out(`Logged in as ${this.user.tag}!`, 'bot');
		});

		this.on('message', (msg) => this.processMessage(msg));

		this.login(token);
	}

	init (): void {
		this.settings.whitelist.forEach((serverId) => {
			this.isInRandomMode[serverId] = false;
			this.randomQueues[serverId] = [];
		});

		this.initialized = true;
	}

	private async search (query: string) : Promise<Track> {
		return new Promise((resolve, reject) => {
			TrackModel.find({}).then((trackDocs) => {
				const tracks = trackDocs as Track[];
				const trackNames = tracks.map(x => x.title);

				const trackQuery = trackNames.map((x) => {
					return x.toLowerCase()
						.replace(/[\(\)]/gi, '')
						.match(/(.*) - (.*)/);
				});

				const wordsGrouped = trackQuery.map((x) => {
					if (x.length == 3) {
						let author = x[1];
						let title = x[2];
			
						return author.split(' ').concat(title.split(' '));
					}
			
					return;
				});

				const queryWords = query.toLowerCase()
					.replace(/[\(\)]/gi, '')
					.split(' ');
				
				for (let i = 0; i < wordsGrouped.length; i++) {
					const group = wordsGrouped[i];
					const weightGroup = group.map(x => queryWords.includes(x));
					let w = 0;
			
					weightGroup.map(x => {
						if (x === true) w++;
					});
			
					tracks[i].queryWeight = w;
				}

				tracks.sort((a, b) => a.queryWeight > b.queryWeight? -1 : 1);

				resolve(tracks[0]);

			}, (err) => defaultMongoErrorHandler(err));
		});
	}

	private async processMessage (msg: Message) : Promise<void> {
		if (!this.initialized) return;
		if (msg.author.bot) return;

		const isMusic = this.settings.musicChannels.includes(msg.channel.id);
		const isUpload = this.settings.musicUploadChannels.includes(msg.channel.id);

		if (!(isMusic || isUpload)) return;

		if (msg.content.startsWith('!play') && isMusic) {
			await this.processPlayCommand(msg);
		}

		if (msg.content.startsWith('!stop') && isMusic) {
			this.processStopCommand(msg);
		}

		if (msg.content.startsWith('!skip') && isMusic) {
			await this.processSkipComand(msg);
		}

		if (msg.content.startsWith('!random') && isMusic) {
			await this.processRandomPlayCommand(msg);
		}

		if (msg.content.startsWith('!count') && isMusic) {
			await this.processCountCommand(msg);
		}

		if (msg.content.startsWith('!roll') && isMusic) {
			this.processRollCommand(msg);
		}

		if (msg.content.match(/^![+\-]1/) && isMusic) {
			this.processRateCommand(msg);
		}

		if (msg.content.match(/(.*) - (.*)/) && isUpload) {
			this.processTrackUpload(msg);
		}

		return;
	}

	private async processPlayCommand (msg: Message) : Promise<void> {
		let query: RegExpMatchArray;
		let trackname: string;
		let track: Track;

		query = msg.content.match(/!play (.*)/);
		if (!query) return;

		track = await this.search(query[1]);

		if (!track) {
			msg.reply('Nothing was found 🕸');
			return;
		}

		track.plays++;
		track.save();

		const voiceChannel = msg.member.voice.channel;

		if (!voiceChannel) {
			msg.reply('Connect to the voice channel 🤡');
			return;
		}

		this.voiceChannels[msg.guild.id] = voiceChannel;
		this.nowPlays[msg.guild.id] = track;
		this.isInRandomMode[msg.guild.id] = false;
		this.randomQueues[msg.guild.id] = [];

		msg.channel.send(`Now playing: ${track.title}`);

		voiceChannel.join().then((conenction) => {
			const dispatcher = conenction.play(track.fname);
			this.connections[msg.guild.id] = conenction;
			msg.react('✔️');

			dispatcher.on('finish', () => {
				voiceChannel.leave();
				this.nowPlays[msg.guild.id] = null;
				this.voiceChannels[msg.guild.id] = null;
			});
		});
	}

	private processStopCommand (msg: Message) : void {
		if (this.voiceChannels[msg.guild.id]) {
			this.nowPlays[msg.guild.id] = null;
			this.voiceChannels[msg.guild.id].leave();
			this.voiceChannels[msg.guild.id] = null;
			this.isInRandomMode[msg.guild.id] = false;
			msg.react('✔️');
			return;
		}

		msg.reply('Can\'t stop :sunglasses:');
		return;
	}

	private async processCountCommand (msg: Message) : Promise<void> {
		TrackModel.find({}).then((trackDocs) => {
			msg.react('✔️');
			msg.reply(`Currently there are ${trackDocs.length} tracks`);
		}, (err) => defaultMongoErrorHandler(err));
	}

	private processRollCommand (msg: Message) : void {
		const rollRegEx = /^!roll ([0-9]{1,6})/;
		const rollRegExMatch = msg.content.match(rollRegEx);
		let rollMax = 100;

		if (rollRegExMatch) {
			rollMax = Number(rollRegExMatch[1]);
		}

		msg.react('✔️');
		msg.reply(`🎲: ${randomInt(rollMax)}`);
	}

	private async processRateCommand (msg: Message) : Promise<void> {
		if (this.voiceChannels[msg.guild.id]) {
			let track = this.nowPlays[msg.guild.id];
			const isUpvote = msg.content.startsWith('!+1');
			const isLiked = track.likes.includes(msg.author.id);
			const isDisiked = track.dislikes.includes(msg.author.id);

			if (isUpvote) {
				if (!isLiked) track.likes.push(msg.author.id);
				if (isDisiked) removeArrayElement(track.dislikes, msg.author.id);
				await track.save();
				msg.react('👍');
				return;
			}

			if (isLiked) removeArrayElement(track.likes, msg.author.id);
			if (!isDisiked) track.dislikes.push(msg.author.id);
			await track.save();
			msg.react('👎');
			return;

			return;
		}

		msg.react('🖕');
		return;
	}

	private async processSkipComand (msg: Message) : Promise<void> {
		if (this.voiceChannels[msg.guild.id] && this.isInRandomMode[msg.guild.id]) {
			let track = this.nowPlays[msg.guild.id];

			track.skips++;
			track.save();

			this.nowPlays[msg.guild.id] = null;
			this.playNextInQueue(msg);

			return;
		}

		msg.reply('There is no queue, so you can\'t skip 👽');
		return;
	}

	private async playNextInQueue (msg: Message) : Promise<void> {
		if (this.isInRandomMode[msg.guild.id]) {
			const pullAndPlay = () => {
				let track = this.randomQueues[msg.guild.id].pop();
				let dispatcher = this.connections[msg.guild.id].play(track.fname);

				track.plays++;
				track.save();

				this.nowPlays[msg.guild.id] = track;
				msg.channel.send(`Now playing: ${track.title}`);

				dispatcher.on('finish', () => {
					this.playNextInQueue(msg);
				});
			};

			if (!this.randomQueues[msg.guild.id].length) {
				TrackModel.find({}).then((trackDocs) => {
					let tracks = trackDocs as Track[];

					shuffleArray(tracks);
					this.randomQueues[msg.guild.id] = tracks;
					pullAndPlay();

				}, (err) => defaultMongoErrorHandler(err));
			} else {
				pullAndPlay();
			}

		} else {
			this.voiceChannels[msg.guild.id].leave();
			this.voiceChannels[msg.guild.id] = null;
			this.isInRandomMode[msg.guild.id] = false;
		}
	}

	private async processTrackUpload (msg: Message) : Promise<void> {
		const trackName = msg.content;

		if (trackName && msg.attachments && msg.attachments.first()) {

			TrackModel.findOne({
				title: trackName
			}).then(async (dbTrack) => {

				if (dbTrack) {
					msg.react('❌');
					if (msg.deletable) msg.delete({ timeout: 60000 });
					let ownMsg = await msg.reply(`Track \`${trackName}\` is alredy known 😬`);
					ownMsg.delete({ timeout: 60000 });
					return;
				}

				let attachment = msg.attachments.first();
				let fsNameId = generateRandomString(128);
				let fsName = path.resolve(this.tracksDir, `${fsNameId}${path.extname(attachment.name)}`);

				const file = fs.createWriteStream(fsName);
				https.get(attachment.url, (res) => {
					res.pipe(file);
				});

				file.on('finish', async () => {
					await new TrackModel({
						title: trackName,
						fname: fsName,
						uploadedServer: msg.guild.id,
						uploadedBy: msg.author.id
					}).save();

					msg.react('✔️');
					if (msg.deletable) msg.delete({ timeout: 60000 });
				});

				file.on('error', (err) => {
					console.error(err);
					msg.react('❌');
					if (msg.deletable) msg.delete({ timeout: 60000 });
				});

			}, (err) => defaultMongoErrorHandler(err));

		} else {
			return;
		}
	}

	private async processRandomPlayCommand (msg: Message) : Promise<void> {
		if (this.isInRandomMode[msg.guild.id]) {
			this.processStopCommand(msg);
			return;
		}

		this.isInRandomMode[msg.guild.id] = true;
		this.randomQueues[msg.guild.id] = [];

		const voiceChannel = msg.member.voice.channel;

		if (!voiceChannel) {
			msg.reply('Connect to the voice channel 🤡');
			return;
		}

		this.voiceChannels[msg.guild.id] = voiceChannel;

		voiceChannel.join().then((conenction) => {
			this.connections[msg.guild.id] = conenction;
			this.playNextInQueue(msg);
			msg.react('✔️');
		});
	}
}

import { generateConnectionString } from '../config/db';
import * as logger from '../modules/logger';
import mongoose from 'mongoose';

mongoose.connect( generateConnectionString() , {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false
}).then(async (db) => {}, (err) => {
	if (err) {
		logger.out('Fatal error, exiting...', 'mongo');
		logger.error('Failed to connect to DB.', err, 'mongo');
		setImmediate(() => process.exit(1));
	}
});

export { Settings, SettingsModel } from './settings';
export { Track, TrackModel } from "./track";

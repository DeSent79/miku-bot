import { Schema, model, Document } from 'mongoose';

export interface Track extends Document {
	title: string,
	fname: string,
	likes: string[],
	dislikes: string[],
	plays: number,
	skips: number,
	uploadedServer: string,
	uploadedBy: string,
	uploadedOn: number,
	queryWeight?: number
}

const TrackSchema = new Schema({
	title: {
		type: Schema.Types.String,
		required: true
	},
	fname: {
		type: Schema.Types.String,
		required: true
	},
	likes: {
		type: [Schema.Types.String],
		default: []
	},
	dislikes: {
		type: [Schema.Types.String],
		default: []
	},
	plays: {
		type: Schema.Types.Number,
		default: 0
	},
	skips: {
		type: Schema.Types.Number,
		default: 0
	},
	uploadedServer: {
		type: Schema.Types.String,
		required: true
	},
	uploadedBy: {
		type: Schema.Types.String,
		required: true
	},
	uploadedOn: {
		type: Schema.Types.Date,
		default: Date.now
	}
});

export const TrackModel = model('Track', TrackSchema);

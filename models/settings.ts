import { Schema, model, Document } from 'mongoose';

export interface Settings extends Document {
	whitelist: string[],
	musicChannels: string[],
	musicUploadChannels: string[]
}

const SettingsSchema = new Schema({
	whitelist: {
		type: [Schema.Types.String],
		default: []
	},
	musicChannels: {
		type: [Schema.Types.String],
		default: []
	},
	musicUploadChannels: {
		type: [Schema.Types.String],
		default: []
	}
});

export const SettingsModel = model('Settings', SettingsSchema);

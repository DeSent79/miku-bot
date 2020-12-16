import path from 'path';
import fs from 'fs';

interface dbConfig {
	ip?: string,
	port?: number,
	name?: string,
	login?: string,
	password?: string
}

const secretPath = path.resolve(__dirname, 'db.secret.json');

let config: dbConfig = {
	ip: '127.0.0.1',
	port: 27017,
	name: 'miku-bot'
}

if ( fs.existsSync(secretPath) ) {
	let secret: dbConfig = JSON.parse( fs.readFileSync(secretPath).toString() );

	config.login = secret.login;
	config.password = secret.password;
}

export function generateConnectionString () : string {
	let auth: string = `${config.ip}:${config.port}`;

	if (config.login && config.password) {
		auth = `${config.login}:${config.password}@${auth}`;
	}

	return `mongodb://${auth}/${config.name}`;
}

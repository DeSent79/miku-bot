function stamp(): string {
	let d = new Date();
	let _date = `${('0'+d.getDate()).slice(-2)}.${('0'+(d.getMonth()+1)).slice(-2)}.${(d.getFullYear())}`;
	let _time = `${('0'+d.getHours()).slice(-2)}:${('0'+d.getMinutes()).slice(-2)}:${('0'+d.getSeconds()).slice(-2)}`;

	return `[${_date}] [${_time}]`;
}

export function out(messageText: string, threadName: string): void {
	return log(messageText, 'out', threadName);
}

export function error(messageText, raw, threadName) {
	return log(messageText, 'error', threadName, raw);
}

function log(messageText: string, logType: 'out'|'error', threadName: string, rawData?: Error): void {
	threadName = threadName? ` [${threadName}]: ` : ': ';

	let line = stamp() + threadName + messageText;

	if (logType == 'out') {
		console.log(line);
		if (rawData) console.log(rawData);
	}

	if (logType == 'error') {
		console.error(line);
		if (rawData) console.error(rawData);
	}
}

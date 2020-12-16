export function generateRandomString(l: number = 16, a: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') : string {
	let r = '';
	for (let i = 0; i < l; i++) r += a[Math.floor(Math.random() * a.length)];
	return r;
}

export function shuffleArray(arr: unknown[]) : void {
	for (let i = arr.length - 1; i > 0; i--){
		const j = Math.floor(Math.random() * i)
		const temp = arr[i]
		arr[i] = arr[j]
		arr[j] = temp
	}
}

export function removeArrayElement(arr: unknown[], el: unknown) : void {
	const index = arr.findIndex(x => x == el);
	if (index >= 0) arr.splice(index, 1);
}

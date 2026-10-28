const EVENT = 'carapecos-toast';

/** Show a floating notice. Longer copy stays on screen longer. Client-only. */
export function toast(message: string) {
	if (typeof document === 'undefined') return;
	document.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export const toastEvent = EVENT;

/** A few seconds for a short line; more time as the message gets longer, capped. */
export function toastDuration(message: string) {
	return Math.min(12_000, Math.max(4_000, 2_400 + message.length * 60));
}

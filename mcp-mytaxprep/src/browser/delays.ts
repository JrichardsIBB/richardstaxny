/**
 * Human-speed delay utilities to avoid detection and ensure
 * pages fully render before interacting.
 */

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** General human-paced delay: 1-3 seconds */
export async function humanDelay(): Promise<void> {
  await sleep(randomBetween(1000, 3000));
}

/** Per-character typing delay: 50-150ms */
export async function typingDelay(): Promise<void> {
  await sleep(randomBetween(50, 150));
}

/** Navigation delay (waiting for page load): 2-5 seconds */
export async function navigationDelay(): Promise<void> {
  await sleep(randomBetween(2000, 5000));
}

/** Click delay (pause before/after clicking): 0.5-1.5 seconds */
export async function clickDelay(): Promise<void> {
  await sleep(randomBetween(500, 1500));
}

/** Short pause: 200-500ms */
export async function shortPause(): Promise<void> {
  await sleep(randomBetween(200, 500));
}

/** Get a random typing speed in ms for Playwright's type() method */
export function getTypingSpeed(): number {
  return randomBetween(50, 150);
}

/** What an uploaded video's R2 key looks like: `videos/<uuid>.mp4` or `.webm`. Checked before a key is saved or deleted. */
export const VIDEO_KEY_PATTERN = /^videos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$/;

// kilocode_change - new file: Speech service constants

/**
 * Hot word phrase that triggers auto-send when detected during recording
 * User says this phrase to automatically submit their message
 */
export const HOT_WORD_PHRASE = "now send message"

/**
 * Custom glossary for Whisper API to improve recognition of technical terms
 * Includes variations of product name and common technical terms
 *
 * Note: Whisper tends to transcribe "kilocode" as "kilo code" (two words)
 * so we include both variations to help with recognition
 */
export const WHISPER_CUSTOM_GLOSSARY = "Kilo Code"

/**
 * Default streaming configuration values
 */
export const DEFAULT_STREAMING_CONFIG = {
	chunkDurationSeconds: 3,
	overlapDurationSeconds: 1,
	language: "en",
	maxChunks: 0,
	hotWordEnabled: true,
	hotWordPhrase: HOT_WORD_PHRASE,
} as const

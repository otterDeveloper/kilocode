// kilocode_change - new file: Tests for graceful error handling in TranscriptionClient
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TranscriptionClient } from "../TranscriptionClient"
import { ProviderSettingsManager } from "../../../core/config/ProviderSettingsManager"
import * as fsSync from "fs"

// Mock fs module
vi.mock("fs", () => ({
	default: {
		promises: {
			stat: vi.fn(),
		},
		createReadStream: vi.fn(),
	},
	promises: {
		stat: vi.fn(),
	},
	createReadStream: vi.fn(),
}))

// Mock openai module
vi.mock("openai", () => ({
	default: class MockOpenAI {
		audio = {
			transcriptions: {
				create: vi.fn(),
			},
		}
	},
	toFile: vi.fn((stream: any, filename: string) => ({
		stream,
		filename,
	})),
}))

describe("TranscriptionClient Error Handling", () => {
	let mockProviderSettingsManager: ProviderSettingsManager
	let transcriptionClient: TranscriptionClient

	beforeEach(() => {
		vi.clearAllMocks()

		// Mock ProviderSettingsManager
		mockProviderSettingsManager = {
			listConfig: vi.fn().mockResolvedValue([
				{
					id: "test-profile",
					apiProvider: "openai",
				},
			]),
			getProfile: vi.fn().mockResolvedValue({
				id: "test-profile",
				apiProvider: "openai",
				openAiApiKey: "test-key",
			}),
		} as any

		transcriptionClient = new TranscriptionClient(mockProviderSettingsManager)
	})

	describe("Empty transcription handling", () => {
		it("should return empty string for silent audio without throwing", async () => {
			// Mock file stat to return valid size
			vi.mocked(fsSync.promises.stat).mockResolvedValue({ size: 5000 } as any)

			// Mock OpenAI client to return empty text
			const mockOpenAI = {
				audio: {
					transcriptions: {
						create: vi.fn().mockResolvedValue({
							text: "",
						}),
					},
				},
			}

			// Replace the OpenAI client
			;(transcriptionClient as any).openai = mockOpenAI

			// Should not throw - should return empty string
			const result = await transcriptionClient.transcribe("/fake/path/chunk.webm")
			expect(result).toBe("")
		})

		it("should return empty string for whitespace-only transcription", async () => {
			// Mock file stat to return valid size
			vi.mocked(fsSync.promises.stat).mockResolvedValue({ size: 5000 } as any)

			const mockOpenAI = {
				audio: {
					transcriptions: {
						create: vi.fn().mockResolvedValue({
							text: "   \n\t  ",
						}),
					},
				},
			}

			;(transcriptionClient as any).openai = mockOpenAI

			const result = await transcriptionClient.transcribe("/fake/path/chunk.webm")
			expect(result).toBe("")
		})

		it("should return trimmed text for valid transcription", async () => {
			// Mock file stat to return valid size
			vi.mocked(fsSync.promises.stat).mockResolvedValue({ size: 5000 } as any)

			const mockOpenAI = {
				audio: {
					transcriptions: {
						create: vi.fn().mockResolvedValue({
							text: "  Hello world  ",
						}),
					},
				},
			}

			;(transcriptionClient as any).openai = mockOpenAI

			const result = await transcriptionClient.transcribe("/fake/path/chunk.webm")
			expect(result).toBe("Hello world")
		})
	})

	describe("File validation", () => {
		it("should return empty string for empty files", async () => {
			// Mock fs.promises.stat to return 0 size
			vi.mocked(fsSync.promises.stat).mockResolvedValue({ size: 0 } as any)

			const result = await transcriptionClient.transcribe("/fake/path/empty.webm")
			expect(result).toBe("")
		})

		it("should return empty string for very small files", async () => {
			// Mock fs.promises.stat to return small size (< 1KB)
			vi.mocked(fsSync.promises.stat).mockResolvedValue({ size: 512 } as any)

			const result = await transcriptionClient.transcribe("/fake/path/small.webm")
			expect(result).toBe("")
		})
	})
})

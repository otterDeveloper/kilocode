# FFmpeg Volume Integration TODO

## Current State

The volume visualizer in [`ChatTextArea.tsx`](../../../webview-ui/src/components/chat/ChatTextArea.tsx) currently uses **simulated animation** because real-time volume data from FFmpeg is not yet implemented.

## What Needs to Be Done

### 1. Enable FFmpeg Volume Metering

FFmpeg's `astats` filter can provide real-time audio level monitoring. This was previously disabled (see [`SpeechService.ts`](../../../src/services/speech/SpeechService.ts) lines 153-154, 290-292, 298-299).

**Implementation approach:**

```typescript
// In SpeechService.buildStreamingArgs()
// Add volume metering filter that doesn't interfere with segment output

const args = [
	...ffmpegConfig.inputArgs,

	// Split audio: one for output, one for volume analysis
	"-filter_complex",
	"[0:a]asplit=2[out][vol];[vol]astats=metadata=1:reset=0.05[vol_out]",

	// Main output for segments
	"-map",
	"[out]",
	...ffmpegConfig.outputArgs,
	"-f",
	"segment",
	"-segment_time",
	String(this.streamingConfig.chunkDurationSeconds),
	"-reset_timestamps",
	"1",
	outputPattern,

	// Volume analysis to null (just for metadata)
	"-map",
	"[vol_out]",
	"-f",
	"null",
	"-",
]
```

### 2. Parse Volume Data from FFmpeg stderr

FFmpeg outputs volume statistics to stderr in this format:

```
[Parsed_astats_1 @ 0x...] lavfi.astats.Overall.RMS_level=-22.4 dB
[Parsed_astats_1 @ 0x...] lavfi.astats.Overall.Peak_level=-3.1 dB
```

**Implementation:**

```typescript
// In SpeechService.startStreamingRecording()
this.ffmpegProcess.stderr.on("data", (data) => {
	const text = data.toString()

	// Parse volume levels
	const rmsMatch = text.match(/lavfi\.astats\.Overall\.RMS_level=([-\d.]+)/)
	const peakMatch = text.match(/lavfi\.astats\.Overall\.Peak_level=([-\d.]+)/)

	if (rmsMatch) {
		const rmsDb = parseFloat(rmsMatch[1])
		// Convert dB to 0-1 linear scale
		// -60 dB = 0, 0 dB = 1
		const linear = Math.max(0, Math.min(1, (rmsDb + 60) / 60))

		// Emit volume update event
		this.emit("volumeUpdate", {
			rmsDb,
			peakDb: peakMatch ? parseFloat(peakMatch[1]) : rmsDb,
			linear,
			at: Date.now() - this.recordingStartTime,
		})
	}
})
```

### 3. Send Volume Updates to Webview

**In [`speechMessageHandlers.ts`](../../../src/core/webview/speechMessageHandlers.ts):**

```typescript
// Add volume update handler
speechService.on("volumeUpdate", (sample: VolumeSample) => {
	provider.postMessageToWebview({
		type: "speechVolumeUpdate",
		volume: sample.linear, // 0-1 scale
	})
})
```

### 4. Update VolumeVisualizer to Use Real Data

**In [`VolumeVisualizer.tsx`](../../../webview-ui/src/components/chat/VolumeVisualizer.tsx):**

Remove the simulated animation logic and use the `volume` prop directly:

```typescript
useEffect(() => {
	if (!isActive) {
		setBarHeights(new Array(BAR_COUNT).fill(MIN_HEIGHT_PERCENT))
		return
	}

	const state = animationRef.current

	// Use real volume data from prop
	state.targetHeights = calculateTargetHeights(volume)

	const animate = () => {
		// ... existing animation logic ...
	}

	if (state.frameId === null) {
		state.frameId = requestAnimationFrame(animate)
	}

	return () => {
		if (state.frameId !== null) {
			cancelAnimationFrame(state.frameId)
			state.frameId = null
		}
	}
}, [volume, isActive]) // Depend on volume prop
```

## Testing

1. Start recording with microphone
2. Speak at varying volumes
3. Verify visualizer bars respond to actual audio levels
4. Test silence detection (bars should drop to minimum)
5. Test loud sounds (bars should reach maximum)

## References

- FFmpeg astats filter: https://ffmpeg.org/ffmpeg-filters.html#astats
- Original volume metering code: [`SpeechService.ts`](../../../src/services/speech/SpeechService.ts) (commented out sections)
- Volume sample interface: [`types.ts`](../../../src/services/speech/types.ts:52-57)

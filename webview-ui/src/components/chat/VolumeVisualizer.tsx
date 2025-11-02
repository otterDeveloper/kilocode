// kilocode_change - new file: Volume visualizer component for microphone input
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface VolumeVisualizerProps {
	/** Volume level from 0 to 1 */
	volume: number
	/** Whether recording is active */
	isActive?: boolean
	/** Custom className */
	className?: string
}

const BAR_COUNT = 5
const BAR_WIDTH = 2
const BAR_GAP = 2
const MAX_HEIGHT = 16
const MIN_HEIGHT_PERCENT = 10
const EASING = 0.15
const ANIMATION_THRESHOLD = 0.001

interface AnimationState {
	targetHeights: number[]
	currentHeights: number[]
	frameId: number | null
}

function calculateTargetHeights(volume: number): number[] {
	const centerIndex = Math.floor(BAR_COUNT / 2)
	return Array.from({ length: BAR_COUNT }, (_, i) => {
		const distanceFromCenter = Math.abs(i - centerIndex)
		const heightMultiplier = 1 - distanceFromCenter * 0.15
		const randomness = 0.85 + Math.random() * 0.15
		return volume * heightMultiplier * randomness
	})
}

/**
 * VolumeVisualizer - Animated vertical bars that respond to audio volume
 *
 * Features:
 * - 5 vertical bars with staggered heights based on volume
 * - Smooth spring-like animation with easing
 * - Yellow color when active, gray when inactive
 * - Responsive to volume changes (0-1 scale)
 * - Simulated animation when no real volume data available
 *
 * TODO: Hook up to real FFmpeg volume data via astats filter
 * Currently using simulated animation until FFmpeg volume metering is implemented
 */
export function VolumeVisualizer({ volume, isActive = true, className }: VolumeVisualizerProps) {
	const [barHeights, setBarHeights] = useState<number[]>(new Array(BAR_COUNT).fill(MIN_HEIGHT_PERCENT))
	const animationRef = useRef<AnimationState>({
		targetHeights: new Array(BAR_COUNT).fill(0),
		currentHeights: new Array(BAR_COUNT).fill(0),
		frameId: null,
	})

	useEffect(() => {
		if (!isActive) {
			// Reset to minimum when inactive
			setBarHeights(new Array(BAR_COUNT).fill(MIN_HEIGHT_PERCENT))
			return
		}

		const state = animationRef.current

		// Simulate volume animation when active (until real FFmpeg data is available)
		// Generate random target heights that create a wave-like pattern
		const simulateVolume = () => {
			const time = Date.now() / 1000
			const baseVolume = 0.3 + Math.sin(time * 2) * 0.2 // Oscillate between 0.1 and 0.5
			state.targetHeights = calculateTargetHeights(baseVolume)
		}

		const animate = () => {
			if (!isActive) {
				state.frameId = null
				return
			}

			// Update target heights periodically for simulation
			simulateVolume()

			const newHeights = state.currentHeights.map((current, i) => {
				const target = state.targetHeights[i]
				const diff = target - current

				if (Math.abs(diff) > ANIMATION_THRESHOLD) {
					return current + diff * EASING
				}

				return current
			})

			state.currentHeights = newHeights
			setBarHeights(newHeights.map((h) => Math.max(MIN_HEIGHT_PERCENT, h * 100)))
			state.frameId = requestAnimationFrame(animate)
		}

		state.frameId = requestAnimationFrame(animate)

		return () => {
			if (state.frameId !== null) {
				cancelAnimationFrame(state.frameId)
				state.frameId = null
			}
		}
	}, [isActive])

	return (
		<div
			className={cn("inline-flex items-end justify-center", className)}
			style={{
				gap: `${BAR_GAP}px`,
				height: `${MAX_HEIGHT}px`,
			}}
			aria-label="Volume level indicator"
			role="meter"
			aria-valuenow={Math.round(volume * 100)}
			aria-valuemin={0}
			aria-valuemax={100}>
			{barHeights.map((height, i) => (
				<div
					key={i}
					className={cn("rounded-full transition-colors duration-200")}
					style={{
						width: `${BAR_WIDTH}px`,
						height: `${height}%`,
						minHeight: `${MIN_HEIGHT_PERCENT}%`,
						backgroundColor: isActive ? "rgb(248, 246, 136)" : "var(--vscode-descriptionForeground)",
						opacity: isActive ? 1 : 0.4,
					}}
				/>
			))}
		</div>
	)
}

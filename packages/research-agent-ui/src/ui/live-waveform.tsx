"use client"

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  type HTMLAttributes,
} from "react"

export interface LiveWaveformProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onError'> {
  active?: boolean
  processing?: boolean
  barWidth?: number
  barHeight?: number
  barGap?: number
  barRadius?: number
  barColor?: string
  fadeEdges?: boolean
  fadeWidth?: number
  height?: string | number
  sensitivity?: number
  smoothingTimeConstant?: number
  fftSize?: number
  historySize?: number
  updateRate?: number
  mode?: "scrolling" | "static"
  onError?: (error: Error) => void
  onStreamReady?: (stream: MediaStream) => void
  onStreamEnd?: () => void
}

export const LiveWaveform = forwardRef<HTMLDivElement, LiveWaveformProps>(
  (
    {
      active = false,
      processing = false,
      barWidth = 3,
      barHeight = 4,
      barGap = 1,
      barRadius = 1.5,
      barColor,
      fadeEdges = true,
      fadeWidth = 24,
      height = 64,
      sensitivity = 1,
      smoothingTimeConstant = 0.8,
      fftSize = 256,
      historySize = 60,
      updateRate = 30,
      mode = "static",
      onError,
      onStreamReady,
      onStreamEnd,
      className,
      ...props
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const animFrameRef = useRef<number>(0)
    const historyRef = useRef<number[]>([])
    const processingPhaseRef = useRef(0)
    const lastUpdateRef = useRef(0)

    const cleanup = useCallback(() => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      analyserRef.current = null
      historyRef.current = []
      onStreamEnd?.()
    }, [onStreamEnd])

    // Draw functions
    const drawStatic = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        dataArray: Uint8Array,
        dpr: number
      ) => {
        const step = barWidth + barGap
        const barCount = Math.floor(w / dpr / step)
        const totalW = barCount * step - barGap
        const startX = (w / dpr - totalW) / 2

        // Sample frequency bins evenly
        const binCount = dataArray.length
        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.floor((i / barCount) * binCount)
          const value = (dataArray[binIndex] / 255) * sensitivity
          const barH = Math.max(barHeight, value * (h / dpr))

          const x = startX + i * step
          const y = (h / dpr - barH) / 2

          ctx.beginPath()
          ctx.roundRect(x * dpr, y * dpr, barWidth * dpr, barH * dpr, barRadius * dpr)
          ctx.fill()
        }
      },
      [barWidth, barGap, barHeight, barRadius, sensitivity]
    )

    const drawScrolling = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        dpr: number
      ) => {
        const history = historyRef.current
        const step = barWidth + barGap
        const maxBars = Math.min(history.length, historySize)
        const startX = w / dpr - maxBars * step

        for (let i = 0; i < maxBars; i++) {
          const value = history[history.length - maxBars + i] * sensitivity
          const barH = Math.max(barHeight, value * (h / dpr))
          const x = startX + i * step
          const y = (h / dpr - barH) / 2

          ctx.beginPath()
          ctx.roundRect(x * dpr, y * dpr, barWidth * dpr, barH * dpr, barRadius * dpr)
          ctx.fill()
        }
      },
      [barWidth, barGap, barHeight, barRadius, sensitivity, historySize]
    )

    const drawProcessing = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        dpr: number,
        phase: number
      ) => {
        const step = barWidth + barGap
        const barCount = Math.floor(w / dpr / step)
        const totalW = barCount * step - barGap
        const startX = (w / dpr - totalW) / 2

        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin((i / barCount) * Math.PI * 2 + phase) * 0.5 + 0.5
          const barH = Math.max(barHeight, wave * (h / dpr) * 0.6)
          const x = startX + i * step
          const y = (h / dpr - barH) / 2

          ctx.beginPath()
          ctx.roundRect(x * dpr, y * dpr, barWidth * dpr, barH * dpr, barRadius * dpr)
          ctx.fill()
        }
      },
      [barWidth, barGap, barHeight, barRadius]
    )

    const applyFade = useCallback(
      (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        if (!fadeEdges) return
        ctx.save()
        ctx.globalCompositeOperation = "destination-in"

        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, "rgba(0,0,0,0)")
        grad.addColorStop(Math.min(fadeWidth / (w || 1), 0.3), "rgba(0,0,0,1)")
        grad.addColorStop(
          Math.max(1 - fadeWidth / (w || 1), 0.7),
          "rgba(0,0,0,1)"
        )
        grad.addColorStop(1, "rgba(0,0,0,0)")

        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
        ctx.restore()
      },
      [fadeEdges, fadeWidth]
    )

    // Main render loop
    useEffect(() => {
      if (!active && !processing) {
        // Clear canvas when idle
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext("2d")
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        return
      }

      let running = true

      const render = (time: number) => {
        if (!running) return
        const canvas = canvasRef.current
        if (!canvas) {
          animFrameRef.current = requestAnimationFrame(render)
          return
        }

        // Throttle
        if (time - lastUpdateRef.current < updateRate) {
          animFrameRef.current = requestAnimationFrame(render)
          return
        }
        lastUpdateRef.current = time

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()
        const w = rect.width * dpr
        const h = rect.height * dpr

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          animFrameRef.current = requestAnimationFrame(render)
          return
        }

        ctx.clearRect(0, 0, w, h)

        // Resolve bar color
        const resolvedColor =
          barColor ||
          getComputedStyle(canvas).getPropertyValue("color") ||
          "#888"
        ctx.fillStyle = resolvedColor

        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        if (processing && !active) {
          processingPhaseRef.current += 0.06
          drawProcessing(ctx, w, h, dpr, processingPhaseRef.current)
        } else if (active && analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)

          if (mode === "scrolling") {
            // Compute average amplitude for history
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
            const avg = sum / dataArray.length / 255
            historyRef.current.push(avg)
            if (historyRef.current.length > historySize * 2) {
              historyRef.current = historyRef.current.slice(-historySize)
            }
            drawScrolling(ctx, w, h, dpr)
          } else {
            drawStatic(ctx, w, h, dataArray, dpr)
          }
        }

        applyFade(ctx, w, h)
        ctx.restore()

        animFrameRef.current = requestAnimationFrame(render)
      }

      animFrameRef.current = requestAnimationFrame(render)

      return () => {
        running = false
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current)
          animFrameRef.current = 0
        }
      }
    }, [
      active,
      processing,
      mode,
      barColor,
      updateRate,
      historySize,
      drawStatic,
      drawScrolling,
      drawProcessing,
      applyFade,
    ])

    // Microphone stream lifecycle
    useEffect(() => {
      if (!active) {
        cleanup()
        return
      }

      let cancelled = false

      const init = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }

          const audioCtx = new AudioContext()
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = fftSize
          analyser.smoothingTimeConstant = smoothingTimeConstant

          const source = audioCtx.createMediaStreamSource(stream)
          source.connect(analyser)

          audioContextRef.current = audioCtx
          analyserRef.current = analyser
          streamRef.current = stream
          sourceRef.current = source

          onStreamReady?.(stream)
        } catch (err) {
          if (!cancelled) {
            onError?.(err instanceof Error ? err : new Error(String(err)))
          }
        }
      }

      init()

      return () => {
        cancelled = true
        cleanup()
      }
    }, [active, fftSize, smoothingTimeConstant, cleanup, onError, onStreamReady])

    const heightStyle = typeof height === "number" ? `${height}px` : height

    return (
      <div
        ref={ref}
        className={className}
        style={{ height: heightStyle, width: "100%", position: "relative" }}
        {...props}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            color: barColor || "currentColor",
          }}
        />
      </div>
    )
  }
)

;(LiveWaveform as any).displayName = "LiveWaveform"

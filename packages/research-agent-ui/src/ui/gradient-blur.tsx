"use client"

import { useEffect, useRef } from "react"

interface GradientBlurProps {
  radius?: number
  opacityDecay?: number
  backgroundColor?: string
  color?: [number, number, number]
  colorGenerator?: () => [number, number, number]
}

export function GradientBlur({
  radius = 60,
  opacityDecay = 0.025,
  backgroundColor = "transparent",
  color,
  colorGenerator,
}: GradientBlurProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const circsRef = useRef<
    Array<{
      col: [number, number, number]
      x: number
      y: number
      grdblur: CanvasGradient
      alpha: number
    }>
  >([])

  const defaultColorGenerator = () => {
    const rgb: [number, number, number] = [
      Math.floor(Math.random() * 130 + 10),
      Math.floor(0.5 * Math.random() * 50),
      Math.floor(0.5 * Math.random() * 255),
    ]
    return rgb
  }

  // ✅ Updated: if color prop exists, use it; otherwise use generator
  const getColor = () => color || colorGenerator?.() || defaultColorGenerator()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()

    const draw = () => {
      ctx.globalCompositeOperation = "source-over"
      if (backgroundColor === "transparent") {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      } else {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.globalCompositeOperation = "lighter"

      const obj = {
        col: getColor(),
        x: mouseRef.current.x,
        y: mouseRef.current.y,
        grdblur: ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          radius
        ),
        alpha: 1,
      }
      circsRef.current.push(obj)

      const toRemove: number[] = []
      for (let i = 0; i < circsRef.current.length; i++) {
        const circ = circsRef.current[i]

        circ.grdblur.addColorStop(0, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.95)`)
        circ.grdblur.addColorStop(0.2, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.7)`)
        circ.grdblur.addColorStop(0.5, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.3)`)
        circ.grdblur.addColorStop(1, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0)`)

        ctx.beginPath()
        ctx.fillStyle = circ.grdblur
        ctx.globalAlpha = circ.alpha
        ctx.arc(circ.x, circ.y, radius, 0, Math.PI * 2)
        ctx.fill()

        circ.alpha -= opacityDecay
        if (circ.alpha <= 0) toRemove.push(i)
      }

      for (let i = toRemove.length - 1; i >= 0; i--) {
        circsRef.current.splice(toRemove[i], 1)
      }

      ctx.globalAlpha = 1
      requestAnimationFrame(draw)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.pageX
      mouseRef.current.y = e.pageY
    }

    const handleTouchMove = (e: TouchEvent) => {
      mouseRef.current.x = e.touches[0].pageX
      mouseRef.current.y = e.touches[0].pageY
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("resize", resizeCanvas)

    draw()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [radius, opacityDecay, backgroundColor, color, colorGenerator])

  return (
    <div className="relative w-full h-screen overflow-hidden pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ background: "transparent" }}
      />
    </div>
  )
}

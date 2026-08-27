'use client'

import { useEffect, useRef } from 'react'

const GLYPHS =
  '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン海小螺λμΩΣ░▒▓█'

const PACKETS = [
  '海小螺 · UPLINK',
  'GET PORT 200',
  'SYNC LOG STREAM',
  'NODE HX-01',
  'TTL SESSION OK',
  'ROUTE TH / JP',
]

function randGlyph() {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '0'
}

export default function HomeSignal() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    let w = 0
    let h = 0
    let columns: { x: number; y: number; speed: number; size: number; chars: string[] }[] = []
    let packets: { x: number; y: number; speed: number; text: string }[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = Math.max(1, wrap.clientWidth)
      h = Math.max(1, wrap.clientHeight)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const colW = 14
      const n = Math.ceil(w / colW)
      columns = Array.from({ length: n }, (_, i) => ({
        x: i * colW,
        y: Math.random() * h,
        speed: (reduce ? 0.15 : 0.45) + Math.random() * (reduce ? 0.2 : 0.7),
        size: 12,
        chars: Array.from({ length: 10 + Math.floor(Math.random() * 6) }, randGlyph),
      }))
      packets = Array.from({ length: 4 }, (_, i) => ({
        x: Math.random() * w,
        y: 36 + i * ((h - 50) / 4),
        speed: (reduce ? 0.15 : 0.35) + Math.random() * 0.4,
        text: PACKETS[i % PACKETS.length] ?? '',
      }))
    }

    const tick = () => {
      if (!visible) return
      ctx.fillStyle = 'rgba(22, 33, 62, 0.22)'
      ctx.fillRect(0, 0, w, h)

      ctx.font = '12px ui-monospace, monospace'
      for (const col of columns) {
        col.y += col.speed
        if (col.y - col.chars.length * col.size > h) {
          col.y = -20
        }
        if (Math.random() > 0.97) {
          const idx = Math.floor(Math.random() * col.chars.length)
          col.chars[idx] = randGlyph()
        }
        col.chars.forEach((ch, i) => {
          const yy = col.y - i * col.size
          if (yy < -16 || yy > h + 16) return
          const a = i === 0 ? 0.9 : Math.max(0.08, 0.55 - i / col.chars.length)
          ctx.fillStyle = i === 0 ? 'rgba(230,240,255,0.9)' : `rgba(160,200,255,${a})`
          ctx.fillText(ch, col.x, yy)
        })
      }

      ctx.font = '11px ui-monospace, monospace'
      for (const p of packets) {
        p.x += p.speed
        if (p.x > w + 180) {
          p.x = -160
          p.text = PACKETS[Math.floor(Math.random() * PACKETS.length)] ?? p.text
        }
        ctx.fillStyle = 'rgba(232,93,76,0.75)'
        ctx.fillText(p.text, p.x, p.y)
      }

      raf = requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting
        if (visible) {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(tick)
        } else {
          cancelAnimationFrame(raf)
        }
      },
      { threshold: 0.1 }
    )
    io.observe(wrap)

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()
    ctx.fillStyle = '#16213e'
    ctx.fillRect(0, 0, w, h)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        aria-hidden="true"
      />
    </div>
  )
}
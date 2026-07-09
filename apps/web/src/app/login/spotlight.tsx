'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/*
 * Login-page-local (see DESIGN.md deviation note in the page component):
 * the card surface reacts to a fine pointer with a faint gold spotlight,
 * and exposes normalized pointer coords (--plx/--ply) that the skyline
 * reads for a small parallax shift. Coarse pointers and
 * prefers-reduced-motion get a static card; nothing functional depends
 * on the effect.
 */

export function SpotlightCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [lit, setLit] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let raf = 0
    let x = 0
    let y = 0

    const apply = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const mx = x - r.left
      const my = y - r.top
      el.style.setProperty('--mx', `${mx}px`)
      el.style.setProperty('--my', `${my}px`)
      el.style.setProperty('--plx', ((mx / r.width) * 2 - 1).toFixed(3))
      el.style.setProperty('--ply', ((my / r.height) * 2 - 1).toFixed(3))
    }

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const enter = () => setLit(true)
    const leave = () => setLit(false)

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <div id="login-card" ref={ref} className={className}>
      {children}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
          lit ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(480px circle at var(--mx, 50%) var(--my, 50%), rgba(201, 169, 110, 0.05), transparent 70%)',
        }}
      />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

/**
 * Scratch paper — freehand canvas for long multiplication / division.
 * No calculator. Just ink on paper.
 */
export default function ScratchPaper({ height = 320 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [color, setColor] = useState('#0b1f1a')
  const [width, setWidth] = useState(2.5)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth
      const h = height
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width
      tmp.height = canvas.height
      tmp.getContext('2d').drawImage(canvas, 0, 0)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (tmp.width) ctx.drawImage(tmp, 0, 0, w, h)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [height])

  function pos(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }

  function start(e) {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.strokeStyle = color
    ctx.lineWidth = width
  }

  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function end() {
    drawing.current = false
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="scratch-wrap">
      <div className="scratch-toolbar">
        <strong>Scratch paper</strong>
        <button type="button" className="btn btn-ghost" onClick={() => setColor('#0b1f1a')} style={{ padding: '6px 10px' }}>
          Ink
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setColor('#e76f51')} style={{ padding: '6px 10px' }}>
          Coral
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setWidth(2.5)} style={{ padding: '6px 10px' }}>
          Fine
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setWidth(5)} style={{ padding: '6px 10px' }}>
          Bold
        </button>
        <button type="button" className="btn btn-secondary" onClick={clear} style={{ padding: '6px 12px', marginLeft: 'auto' }}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="scratch-canvas"
        style={{ height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Work long multiplication & division here. No calculator — ever.
      </p>
    </div>
  )
}

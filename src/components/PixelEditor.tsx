import { useState, useCallback, useRef } from 'react'

interface PixelEditorProps {
  grid: number[][]
  width: number
  height: number
  onChange: (grid: number[][]) => void
  onResize: (width: number, height: number) => void
  constrainedCells?: Set<string>  // "row,col" keys of cells that can't be satisfied
}

const CELL_SIZE = 20
const GRID_GAP = 1

export function PixelEditor({ grid, width, height, onChange, onResize, constrainedCells }: PixelEditorProps) {
  const paintMode = useRef<0 | 1 | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const lastTouchCell = useRef<string | null>(null)

  const toggleCell = useCallback((row: number, col: number, forceValue?: 0 | 1) => {
    const newGrid = grid.map(r => [...r])
    const value = forceValue ?? (newGrid[row][col] === 1 ? 0 : 1) as 0 | 1
    newGrid[row][col] = value
    onChange(newGrid)
    return value
  }, [grid, onChange])

  const handleMouseDown = useCallback((row: number, col: number) => {
    const newValue = toggleCell(row, col)
    paintMode.current = newValue as 0 | 1
    setIsDragging(true)
  }, [toggleCell])

  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (isDragging && paintMode.current !== null) {
      toggleCell(row, col, paintMode.current)
    }
  }, [isDragging, toggleCell])

  const handleMouseUp = useCallback(() => {
    paintMode.current = null
    setIsDragging(false)
  }, [])

  // Touch support: resolve touch position to grid cell
  const getCellFromTouch = useCallback((touch: React.Touch): { row: number; col: number } | null => {
    const gridEl = gridRef.current
    if (!gridEl) return null
    const rect = gridEl.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const cellPitch = CELL_SIZE + GRID_GAP
    const col = Math.floor((x - GRID_GAP) / cellPitch)
    const row = Math.floor((y - GRID_GAP) / cellPitch)
    if (row < 0 || row >= height || col < 0 || col >= width) return null
    return { row, col }
  }, [width, height])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const cell = getCellFromTouch(e.touches[0])
    if (!cell) return
    const newValue = toggleCell(cell.row, cell.col)
    paintMode.current = newValue as 0 | 1
    lastTouchCell.current = `${cell.row},${cell.col}`
    setIsDragging(true)
  }, [getCellFromTouch, toggleCell])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (paintMode.current === null) return
    const cell = getCellFromTouch(e.touches[0])
    if (!cell) return
    const key = `${cell.row},${cell.col}`
    if (key === lastTouchCell.current) return // same cell, skip
    lastTouchCell.current = key
    toggleCell(cell.row, cell.col, paintMode.current)
  }, [getCellFromTouch, toggleCell])

  const handleTouchEnd = useCallback(() => {
    paintMode.current = null
    lastTouchCell.current = null
    setIsDragging(false)
  }, [])

  const handleClear = useCallback(() => {
    onChange(Array.from({ length: height }, () => Array(width).fill(0)))
  }, [width, height, onChange])

  const handleFill = useCallback(() => {
    onChange(Array.from({ length: height }, () => Array(width).fill(1)))
  }, [width, height, onChange])

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Size controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          W:
          <input
            type="number"
            value={width}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v >= 1 && v <= 40) onResize(v, height)
            }}
            style={{ width: 48, padding: 4, boxSizing: 'border-box' }}
            min={1} max={40}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          H:
          <input
            type="number"
            value={height}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v >= 1 && v <= 40) onResize(width, v)
            }}
            style={{ width: 48, padding: 4, boxSizing: 'border-box' }}
            min={1} max={40}
          />
        </label>
        <button onClick={handleClear} style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
          Clear
        </button>
        <button onClick={handleFill} style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
          Fill
        </button>
      </div>

      {/* Pixel grid */}
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <div
          ref={gridRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: 'inline-grid',
            gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
            gap: GRID_GAP,
            background: '#ccc',
            padding: GRID_GAP,
            borderRadius: 4,
            cursor: 'crosshair',
            userSelect: 'none',
            touchAction: 'none',
          }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isConstrained = constrainedCells?.has(`${r},${c}`) ?? false
            let bg: string
            if (cell === 1) {
              bg = isConstrained ? '#cc4444' : '#000'
            } else {
              bg = isConstrained ? '#ffcccc' : '#fff'
            }
            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={(e) => { e.preventDefault(); handleMouseDown(r, c) }}
                onMouseEnter={() => handleMouseEnter(r, c)}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: bg,
                  borderRadius: 2,
                }}
              />
            )
          })
        )}
      </div>
      </div>

      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        Click/tap to toggle · drag to paint · {width}×{height} = {width * height} modules
      </div>
    </div>
  )
}

/** Create an empty grid of given dimensions */
export function createEmptyGrid(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array(width).fill(0))
}

/** Resize a grid, preserving existing content where possible */
export function resizeGrid(grid: number[][], newWidth: number, newHeight: number): number[][] {
  const result: number[][] = []
  for (let r = 0; r < newHeight; r++) {
    const row: number[] = []
    for (let c = 0; c < newWidth; c++) {
      row.push(r < grid.length && c < (grid[0]?.length ?? 0) ? grid[r][c] : 0)
    }
    result.push(row)
  }
  return result
}

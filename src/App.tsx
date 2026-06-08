import { useState, useMemo, useCallback } from 'react'
import { generateQR, generateQRWithArt, findOptimalPosition, gridToSVG, type ArtPixel } from './qr/engine'
import { PIXEL_ARTS, artToPixels, textToPixelArt } from './qr/pixelArt'
import { PixelEditor, createEmptyGrid, resizeGrid } from './components/PixelEditor'
import type { ErrorCorrectionLevel, QRGrid } from './qr/types'
import './App.css'

interface ArtLayer {
  id: string
  name: string
  grid: number[][]
  width: number
  height: number
}

let layerIdCounter = 1
function makeLayerId() { return `layer-${layerIdCounter++}` }

function App() {
  const [urlPrefix, setUrlPrefix] = useState('https://alexkafer.com/labs/qr-art/')
  const [version, setVersion] = useState(5)
  const [ecLevel, setEcLevel] = useState<ErrorCorrectionLevel>('L')
  const [maskPattern, setMaskPattern] = useState<number | undefined>(undefined)
  const [useArt, setUseArt] = useState(true)
  const [artBorder, setArtBorder] = useState(true)

  // Multi-layer state
  const defaultArt = PIXEL_ARTS['R♥A']
  const [layers, setLayers] = useState<ArtLayer[]>([
    { id: makeLayerId(), name: 'R♥A', grid: defaultArt.grid.map(r => [...r]), width: defaultArt.width, height: defaultArt.height }
  ])
  const [activeLayerId, setActiveLayerId] = useState(layers[0].id)

  const activeLayer = layers.find(l => l.id === activeLayerId) ?? layers[0]
  const activeLayerIndex = layers.findIndex(l => l.id === activeLayerId)

  // Greedy auto-placement: place each layer in priority order, excluding cells claimed by earlier layers
  const layerPlacements = useMemo(() => {
    if (!useArt) return []

    const placements: { layerId: string; pos: { row: number; col: number } | null }[] = []
    const occupiedCells = new Set<string>()

    for (const layer of layers) {
      const bw = artBorder ? layer.width + 2 : layer.width
      const bh = artBorder ? layer.height + 2 : layer.height
      const pos = findOptimalPosition(urlPrefix, version, ecLevel, bw, bh, occupiedCells)
      placements.push({ layerId: layer.id, pos })

      // Mark cells as occupied for the next layer
      if (pos) {
        for (let r = 0; r < bh; r++) {
          for (let c = 0; c < bw; c++) {
            occupiedCells.add(`${pos.row + r},${pos.col + c}`)
          }
        }
      }
    }

    return placements
  }, [useArt, layers, urlPrefix, version, ecLevel, artBorder])

  // Build merged art pixels from all placed layers
  const artPixels = useMemo(() => {
    if (!useArt) return []

    const allPixels: ArtPixel[] = []

    for (const placement of layerPlacements) {
      if (!placement.pos) continue
      const layer = layers.find(l => l.id === placement.layerId)
      if (!layer) continue

      const rowOffset = artBorder ? 1 : 0
      const colOffset = artBorder ? 1 : 0
      const art = { name: layer.name, width: layer.width, height: layer.height, grid: layer.grid }
      const pixels = artToPixels(art, placement.pos.row + rowOffset, placement.pos.col + colOffset)

      if (artBorder) {
        const artSet = new Set(pixels.map(p => `${p.row},${p.col}`))
        const borderSet = new Set<string>()
        for (const pixel of pixels) {
          if (pixel.value !== 1) continue
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue
              const nr = pixel.row + dr
              const nc = pixel.col + dc
              const key = `${nr},${nc}`
              if (!artSet.has(key) && !borderSet.has(key)) {
                borderSet.add(key)
                pixels.push({ row: nr, col: nc, value: 0 })
              }
            }
          }
        }
      }

      allPixels.push(...pixels)
    }

    return allPixels
  }, [useArt, layers, layerPlacements, artBorder])

  const result = useMemo(() => {
    try {
      if (useArt && artPixels.length > 0) {
        return generateQRWithArt({
          urlPrefix,
          version,
          ecLevel,
          artPixels,
          maskPattern,
        })
      } else {
        const grid = generateQR({
          data: urlPrefix,
          version,
          ecLevel,
          maskPattern,
        })
        return { grid, decodedUrl: urlPrefix, maskPattern: maskPattern ?? 0, overlayFlips: 0, maxFlips: 0, skippedFlips: 0, constrainedPixels: new Set<string>() } as const
      }
    } catch (e) {
      console.error('QR generation error:', e)
      return null
    }
  }, [urlPrefix, version, ecLevel, maskPattern, artPixels, useArt])

  // Compute constrained cells for the active layer only
  const constrainedEditorCells = useMemo(() => {
    const cells = new Set<string>()
    if (!result || !('constrainedPixels' in result)) return cells
    const cp = result.constrainedPixels as Set<string>
    const placement = layerPlacements.find(p => p.layerId === activeLayerId)
    if (!placement?.pos) return cells
    const rowOffset = artBorder ? 1 : 0
    const colOffset = artBorder ? 1 : 0
    for (const key of cp) {
      const [r, c] = key.split(',').map(Number)
      const editorR = r - placement.pos.row - rowOffset
      const editorC = c - placement.pos.col - colOffset
      if (editorR >= 0 && editorR < activeLayer.height && editorC >= 0 && editorC < activeLayer.width) {
        cells.add(`${editorR},${editorC}`)
      }
    }
    return cells
  }, [result, layerPlacements, activeLayerId, activeLayer, artBorder])

  const svg = useMemo(() => {
    if (!result) return ''
    return gridToSVG(result.grid, 10, 4)
  }, [result])

  const downloadSVG = useCallback(() => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-art.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [svg])

  // Layer management
  const addLayer = useCallback(() => {
    const id = makeLayerId()
    setLayers(prev => [...prev, { id, name: `Layer ${prev.length + 1}`, grid: createEmptyGrid(7, 7), width: 7, height: 7 }])
    setActiveLayerId(id)
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id)
      if (next.length === 0) return prev // don't remove last layer
      return next
    })
    if (activeLayerId === id) {
      setActiveLayerId(layers.find(l => l.id !== id)?.id ?? layers[0].id)
    }
  }, [activeLayerId, layers])

  const moveLayer = useCallback((id: string, direction: -1 | 1) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx < 0) return prev
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next
    })
  }, [])

  const updateActiveLayer = useCallback((updates: Partial<ArtLayer>) => {
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, ...updates } : l))
  }, [activeLayerId])

  const loadPresetToActive = useCallback((name: string, art: typeof defaultArt) => {
    updateActiveLayer({
      name,
      grid: art.grid.map(r => [...r]),
      width: art.width,
      height: art.height,
    })
  }, [updateActiveLayer])

  const activePlacement = layerPlacements.find(p => p.layerId === activeLayerId)
  const unplacedLayers = layerPlacements.filter(p => p.pos === null)

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 4 }}>QR Art Generator</h1>
      <p style={{ color: '#666', marginTop: 0 }}>
        Create QR codes with embedded pixel art
      </p>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Controls */}
        <div style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 600 }}>
          <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend>URL Prefix</legend>
            <input
              type="text"
              value={urlPrefix}
              onChange={(e) => setUrlPrefix(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 14, boxSizing: 'border-box' }}
            />
          </fieldset>

          <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend>QR Settings</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                Version:
                <select value={version} onChange={(e) => setVersion(Number(e.target.value))}
                  style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }}>
                  {[2, 3, 4, 5, 6].map((v) => (
                    <option key={v} value={v}>V{v} ({17 + v * 4}×{17 + v * 4})</option>
                  ))}
                </select>
              </label>
              <label>
                EC Level:
                <select value={ecLevel} onChange={(e) => setEcLevel(e.target.value as ErrorCorrectionLevel)}
                  style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }}>
                  <option value="L">L (7%)</option>
                  <option value="M">M (15%)</option>
                  <option value="Q">Q (25%)</option>
                  <option value="H">H (30%)</option>
                </select>
              </label>
              <label>
                Mask:
                <select
                  value={maskPattern === undefined ? 'auto' : maskPattern}
                  onChange={(e) => setMaskPattern(e.target.value === 'auto' ? undefined : Number(e.target.value))}
                  style={{ display: 'block', width: '100%', padding: 6, marginTop: 4 }}
                >
                  <option value="auto">Auto</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((m) => (
                    <option key={m} value={m}>Pattern {m}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16, minWidth: 0 }}>
            <legend>Pixel Art Layers</legend>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={useArt} onChange={(e) => setUseArt(e.target.checked)} />
              Enable art overlay
            </label>
            {useArt && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <input type="checkbox" checked={artBorder} onChange={(e) => setArtBorder(e.target.checked)} />
                  White border around art
                </label>

                {/* Layer list */}
                <div style={{ border: '1px solid #eee', borderRadius: 6, marginBottom: 12, overflow: 'hidden' }}>
                  {layers.map((layer, idx) => {
                    const placement = layerPlacements.find(p => p.layerId === layer.id)
                    const isActive = layer.id === activeLayerId
                    const isUnplaced = placement?.pos === null
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setActiveLayerId(layer.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                          background: isActive ? '#e8f4ff' : (idx % 2 === 0 ? '#fafafa' : '#fff'),
                          borderBottom: idx < layers.length - 1 ? '1px solid #eee' : 'none',
                          cursor: 'pointer',
                          borderLeft: isActive ? '3px solid #3498db' : '3px solid transparent',
                        }}
                      >
                        <span style={{ fontSize: 11, color: '#999', width: 16 }}>#{idx + 1}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400 }}>
                          {layer.name}
                          <span style={{ color: '#999', fontWeight: 400 }}> ({layer.width}×{layer.height})</span>
                        </span>
                        {isUnplaced && (
                          <span style={{ fontSize: 11, color: '#e74c3c', fontWeight: 600 }}>⚠ No fit</span>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, -1) }}
                          disabled={idx === 0}
                          style={{ padding: '1px 4px', fontSize: 11, cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                        <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 1) }}
                          disabled={idx === layers.length - 1}
                          style={{ padding: '1px 4px', fontSize: 11, cursor: 'pointer', opacity: idx === layers.length - 1 ? 0.3 : 1 }}>↓</button>
                        <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id) }}
                          disabled={layers.length <= 1}
                          style={{ padding: '1px 4px', fontSize: 11, cursor: 'pointer', color: '#e74c3c', opacity: layers.length <= 1 ? 0.3 : 1 }}>×</button>
                      </div>
                    )
                  })}
                </div>
                <button onClick={addLayer} style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>
                  + Add Layer
                </button>

                {/* Warning for unplaced layers */}
                {unplacedLayers.length > 0 && (
                  <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 12 }}>
                    ⚠️ {unplacedLayers.length} layer{unplacedLayers.length > 1 ? 's' : ''} couldn't be placed — not enough room in the QR grid.
                    Try increasing the QR version or reducing art size.
                  </div>
                )}

                {/* Active layer editor */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <strong style={{ fontSize: 13 }}>Editing:</strong>
                    <input
                      type="text"
                      value={activeLayer.name}
                      onChange={(e) => updateActiveLayer({ name: e.target.value })}
                      style={{ flex: 1, padding: 4, fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                    />
                  </div>

                  {/* Text to pixel art */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Type text (A-Z, 0-9, ♥♡★∞)"
                        style={{ flex: 1, padding: 6, fontSize: 13, boxSizing: 'border-box' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const art = textToPixelArt((e.target as HTMLInputElement).value)
                            if (art) {
                              updateActiveLayer({ grid: art.grid.map(r => [...r]), width: art.width, height: art.height, name: (e.target as HTMLInputElement).value })
                            }
                          }
                        }}
                        id={`text-input-${activeLayerId}`}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`text-input-${activeLayerId}`) as HTMLInputElement
                          if (!input) return
                          const art = textToPixelArt(input.value)
                          if (art) {
                            updateActiveLayer({ grid: art.grid.map(r => [...r]), width: art.width, height: art.height, name: input.value })
                          }
                        }}
                        style={{ padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}
                      >
                        Render
                      </button>
                    </div>
                  </div>

                  {/* Presets */}
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                    {Object.entries(PIXEL_ARTS).map(([name, art]) => (
                      <button
                        key={name}
                        onClick={() => loadPresetToActive(name, art)}
                        style={{ padding: '2px 7px', fontSize: 11, cursor: 'pointer' }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  {/* Pixel editor */}
                  <PixelEditor
                    grid={activeLayer.grid}
                    width={activeLayer.width}
                    height={activeLayer.height}
                    onChange={(grid) => updateActiveLayer({ grid })}
                    onResize={(w, h) => {
                      updateActiveLayer({
                        grid: resizeGrid(activeLayer.grid, w, h),
                        width: w,
                        height: h,
                      })
                    }}
                    constrainedCells={constrainedEditorCells}
                  />

                  {/* Placement info */}
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                    {activePlacement?.pos ? (
                      <>
                        Auto-placed at row {activePlacement.pos.row}, col {activePlacement.pos.col}
                        {constrainedEditorCells.size > 0 && (
                          <span style={{ color: '#e74c3c' }}>
                            {' '}· {constrainedEditorCells.size} pixel{constrainedEditorCells.size > 1 ? 's' : ''} can't be satisfied
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                        ⚠ Cannot fit this layer — no valid position available
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </fieldset>

          {result && (
            <fieldset style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <legend>Output</legend>
              <div style={{ marginBottom: 8 }}>
                <strong>Decoded URL:</strong>
                <code style={{ display: 'block', padding: 8, background: '#f5f5f5', borderRadius: 4, marginTop: 4, wordBreak: 'break-all', fontSize: 12 }}>
                  {urlPrefix + ('suffixBytes' in result
                    ? result.suffixBytes.map((b: number) => {
                        if (b >= 0x30 && b <= 0x39 || b >= 0x41 && b <= 0x5A || b >= 0x61 && b <= 0x7A || [0x2D, 0x5F, 0x2E, 0x7E].includes(b)) return String.fromCharCode(b);
                        return '%' + b.toString(16).padStart(2, '0').toUpperCase();
                      }).join('')
                    : '')}
                </code>
              </div>
              {'suffixBytes' in result && (
                <div style={{ marginBottom: 8 }}>
                  <strong>Suffix hex:</strong>{' '}
                  <code>{(result.suffixBytes as number[]).map((b: number) => b.toString(16).padStart(2, '0')).join(' ')}</code>
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <strong>Mask Pattern:</strong> {result.maskPattern}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>EC Overlay:</strong> {result.overlayFlips} flips (max {result.maxFlips} correctable)
                {result.skippedFlips > 0 && <span style={{ color: '#e67e22' }}> · {result.skippedFlips} skipped</span>}
                {result.overlayFlips <= result.maxFlips ? ' ✅' : ' ⚠️'}
              </div>
              <button onClick={downloadSVG} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Download SVG
              </button>
            </fieldset>
          )}
        </div>

        {/* QR Preview */}
        <div style={{ flex: '1 1 350px', minWidth: 300 }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <h3 style={{ marginTop: 0 }}>Preview</h3>
            {svg ? (
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
                style={{ background: 'white', padding: 16, borderRadius: 8, border: '1px solid #ddd' }}
              />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#999', border: '1px solid #ddd', borderRadius: 8 }}>
                Error generating QR code
              </div>
            )}

            {/* Module type legend */}
            {result && (
              <QRGridDebug grid={result.grid} artPixels={artPixels} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QRGridDebug({ grid, artPixels }: { grid: QRGrid; artPixels: ArtPixel[] }) {
  const artPositions = new Set(artPixels.map((p) => `${p.row},${p.col}`))
  const moduleSize = Math.min(12, Math.floor(500 / grid.size))

  const typeColors: Record<string, string> = {
    finder: '#e74c3c',
    separator: '#f39c12',
    timing: '#3498db',
    alignment: '#9b59b6',
    format: '#1abc9c',
    dark: '#2c3e50',
    data: '#ecf0f1',
  }

  return (
    <div style={{ marginTop: 16, overflowX: 'auto' }}>
      <h4 style={{ marginBottom: 8 }}>Module Map</h4>
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${grid.size}, ${moduleSize}px)`,
        gap: 1,
        background: '#ccc',
        padding: 1,
        borderRadius: 4,
      }}>
        {grid.types.flatMap((row, r) =>
          row.map((type, c) => {
            const isArt = artPositions.has(`${r},${c}`)
            return (
              <div
                key={`${r}-${c}`}
                title={`[${r},${c}] ${type}${isArt ? ' (ART)' : ''}`}
                style={{
                  width: moduleSize,
                  height: moduleSize,
                  background: isArt ? '#ff6b6b' : typeColors[type] || '#ecf0f1',
                  opacity: grid.modules[r][c] ? 1 : 0.3,
                }}
              />
            )
          })
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontSize: 12 }}>
        {Object.entries(typeColors).map(([type, color]) => (
          <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: color, borderRadius: 2, display: 'inline-block' }} />
            {type}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, background: '#ff6b6b', borderRadius: 2, display: 'inline-block' }} />
          art
        </span>
      </div>
    </div>
  )
}

export default App

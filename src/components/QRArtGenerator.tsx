import { useState, useMemo, useCallback } from 'react'
import { generateQR, generateQRWithArt, findOptimalPosition, gridToSVG, type ArtPixel } from '../qr/engine'
import { PIXEL_ARTS, artToPixels, textToPixelArt } from '../qr/pixelArt'
import { PixelEditor, resizeGrid } from './PixelEditor'
import type { ErrorCorrectionLevel, QRGrid } from '../qr/types'

export interface QRArtGeneratorProps {
  /** Default URL prefix for generated QR codes */
  defaultUrl?: string
  /** Default QR version (2-6) */
  defaultVersion?: number
  /** Default error correction level */
  defaultEcLevel?: ErrorCorrectionLevel
  /** Whether to show the module map debug view */
  showModuleMap?: boolean
  /** Custom CSS class name for the root container */
  className?: string
  /** Color theme: 'light', 'dark', or 'auto' (respects prefers-color-scheme) */
  theme?: 'light' | 'dark' | 'auto'
}

export function QRArtGenerator({
  defaultUrl = 'https://alexkafer.com/labs/qr-art?code=',
  defaultVersion = 5,
  defaultEcLevel = 'L',
  showModuleMap = true,
  className,
  theme = 'auto',
}: QRArtGeneratorProps) {
  const [urlPrefix, setUrlPrefix] = useState(defaultUrl)
  const [version, setVersion] = useState(defaultVersion)
  const [ecLevel, setEcLevel] = useState<ErrorCorrectionLevel>(defaultEcLevel)
  const [maskPattern, setMaskPattern] = useState<number | undefined>(undefined)
  const [useArt, setUseArt] = useState(true)
  const [artBorder, setArtBorder] = useState(true)

  const defaultArt = PIXEL_ARTS['R♥A']
  const [editorGrid, setEditorGrid] = useState<number[][]>(defaultArt.grid.map(r => [...r]))
  const [editorWidth, setEditorWidth] = useState(defaultArt.width)
  const [editorHeight, setEditorHeight] = useState(defaultArt.height)

  const optimalPos = useMemo((): { row: number; col: number } => {
    if (!useArt || editorWidth === 0 || editorHeight === 0) return { row: 0, col: 0 }
    const bw = artBorder ? editorWidth + 2 : editorWidth
    const bh = artBorder ? editorHeight + 2 : editorHeight
    return findOptimalPosition(urlPrefix, version, ecLevel, bw, bh) ?? { row: 0, col: 0 }
  }, [urlPrefix, version, ecLevel, editorWidth, editorHeight, useArt, artBorder])

  const artPixels = useMemo(() => {
    if (!useArt) return []
    const art = { name: 'custom', width: editorWidth, height: editorHeight, grid: editorGrid }
    const rowOffset = artBorder ? 1 : 0
    const colOffset = artBorder ? 1 : 0
    const pixels = artToPixels(art, optimalPos.row + rowOffset, optimalPos.col + colOffset)

    if (!artBorder) return pixels

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

    return pixels
  }, [useArt, editorGrid, editorWidth, editorHeight, optimalPos, artBorder])

  const result = useMemo(() => {
    try {
      if (useArt && artPixels.length > 0) {
        return generateQRWithArt({ urlPrefix, version, ecLevel, artPixels, maskPattern })
      } else {
        const grid = generateQR({ data: urlPrefix, version, ecLevel, maskPattern })
        return { grid, decodedUrl: urlPrefix, maskPattern: maskPattern ?? 0, overlayFlips: 0, maxFlips: 0, skippedFlips: 0, constrainedPixels: new Set<string>() } as const
      }
    } catch (e) {
      console.error('QR generation error:', e)
      return null
    }
  }, [urlPrefix, version, ecLevel, maskPattern, artPixels, useArt])

  const constrainedEditorCells = useMemo(() => {
    const cells = new Set<string>()
    if (!result || !('constrainedPixels' in result)) return cells
    const cp = result.constrainedPixels as Set<string>
    for (const key of cp) {
      const [r, c] = key.split(',').map(Number)
      const editorR = r - optimalPos.row - (artBorder ? 1 : 0)
      const editorC = c - optimalPos.col - (artBorder ? 1 : 0)
      if (editorR >= 0 && editorR < editorHeight && editorC >= 0 && editorC < editorWidth) {
        cells.add(`${editorR},${editorC}`)
      }
    }
    return cells
  }, [result, optimalPos, editorWidth, editorHeight, artBorder])

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

  const themeVars = {
    '--qr-bg': 'var(--qr-theme-bg)',
    '--qr-fg': 'var(--qr-theme-fg)',
    '--qr-muted': 'var(--qr-theme-muted)',
    '--qr-border': 'var(--qr-theme-border)',
    '--qr-input-bg': 'var(--qr-theme-input-bg)',
    '--qr-code-bg': 'var(--qr-theme-code-bg)',
    '--qr-preview-bg': 'var(--qr-theme-preview-bg)',
  } as React.CSSProperties

  const themeClass = theme === 'dark' ? 'qr-art-dark' : theme === 'light' ? 'qr-art-light' : 'qr-art-auto'

  return (
    <div className={`${themeClass}${className ? ` ${className}` : ''}`} style={{ ...themeVars, padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui', color: 'var(--qr-fg)' }}>
      <style>{`
        .qr-art-light {
          --qr-theme-bg: #ffffff;
          --qr-theme-fg: #1a1a1a;
          --qr-theme-muted: #666666;
          --qr-theme-border: #dddddd;
          --qr-theme-input-bg: #ffffff;
          --qr-theme-code-bg: #f5f5f5;
          --qr-theme-preview-bg: #ffffff;
        }
        .qr-art-dark {
          --qr-theme-bg: transparent;
          --qr-theme-fg: #e4e4e7;
          --qr-theme-muted: #a1a1aa;
          --qr-theme-border: #3f3f46;
          --qr-theme-input-bg: #18181b;
          --qr-theme-code-bg: #27272a;
          --qr-theme-preview-bg: #ffffff;
        }
        .qr-art-auto {
          --qr-theme-bg: #ffffff;
          --qr-theme-fg: #1a1a1a;
          --qr-theme-muted: #666666;
          --qr-theme-border: #dddddd;
          --qr-theme-input-bg: #ffffff;
          --qr-theme-code-bg: #f5f5f5;
          --qr-theme-preview-bg: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
          .qr-art-auto {
            --qr-theme-bg: transparent;
            --qr-theme-fg: #e4e4e7;
            --qr-theme-muted: #a1a1aa;
            --qr-theme-border: #3f3f46;
            --qr-theme-input-bg: #18181b;
            --qr-theme-code-bg: #27272a;
            --qr-theme-preview-bg: #ffffff;
          }
        }
        .${themeClass} input, .${themeClass} select, .${themeClass} button {
          color: var(--qr-theme-fg);
          background: var(--qr-theme-input-bg);
          border: 1px solid var(--qr-theme-border);
          border-radius: 4px;
        }
        .${themeClass} fieldset {
          border-color: var(--qr-theme-border);
        }
        .${themeClass} legend {
          color: var(--qr-theme-fg);
        }
        .${themeClass} label {
          color: var(--qr-theme-fg);
        }
      `}</style>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Controls */}
        <div style={{ flex: '1 1 360px', minWidth: 0, maxWidth: 600 }}>
          <fieldset style={{ border: '1px solid var(--qr-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend>URL Prefix</legend>
            <input
              type="text"
              value={urlPrefix}
              onChange={(e) => setUrlPrefix(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 14, boxSizing: 'border-box', background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}
            />
          </fieldset>

          <fieldset style={{ border: '1px solid var(--qr-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend>QR Settings</legend>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label>
                Version:
                <select value={version} onChange={(e) => setVersion(Number(e.target.value))}
                  style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}>
                  {[2, 3, 4, 5, 6].map((v) => (
                    <option key={v} value={v}>V{v} ({17 + v * 4}×{17 + v * 4})</option>
                  ))}
                </select>
              </label>
              <label>
                EC Level:
                <select value={ecLevel} onChange={(e) => setEcLevel(e.target.value as ErrorCorrectionLevel)}
                  style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}>
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
                  style={{ display: 'block', width: '100%', padding: 6, marginTop: 4, background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}
                >
                  <option value="auto">Auto</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((m) => (
                    <option key={m} value={m}>Pattern {m}</option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset style={{ border: '1px solid var(--qr-border)', borderRadius: 8, padding: 16, marginBottom: 16, minWidth: 0 }}>
            <legend>Pixel Art</legend>
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

                {/* Text to pixel art */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                    Type text (A-Z, 0-9, ♥♡★∞):
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="e.g. R♥A, LOVE, HI!"
                      style={{ flex: 1, padding: 6, fontSize: 14, boxSizing: 'border-box', background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const art = textToPixelArt((e.target as HTMLInputElement).value)
                          if (art) {
                            setEditorGrid(art.grid.map(r => [...r]))
                            setEditorWidth(art.width)
                            setEditorHeight(art.height)
                          }
                        }
                      }}
                      id="qr-art-text-input"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById('qr-art-text-input') as HTMLInputElement
                        if (!input) return
                        const art = textToPixelArt(input.value)
                        if (art) {
                          setEditorGrid(art.grid.map(r => [...r]))
                          setEditorWidth(art.width)
                          setEditorHeight(art.height)
                        }
                      }}
                      style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 13, background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}
                    >
                      Render
                    </button>
                  </div>
                </div>

                {/* Preset loader */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13 }}>Presets:</span>
                  {Object.entries(PIXEL_ARTS).map(([name, art]) => (
                    <button
                      key={name}
                      onClick={() => {
                        setEditorGrid(art.grid.map(r => [...r]))
                        setEditorWidth(art.width)
                        setEditorHeight(art.height)
                      }}
                      style={{ padding: '3px 8px', fontSize: 11, cursor: 'pointer', background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Pixel editor */}
                <PixelEditor
                  grid={editorGrid}
                  width={editorWidth}
                  height={editorHeight}
                  onChange={setEditorGrid}
                  onResize={(w, h) => {
                    setEditorGrid(resizeGrid(editorGrid, w, h))
                    setEditorWidth(w)
                    setEditorHeight(h)
                  }}
                  constrainedCells={constrainedEditorCells}
                />

                {/* Auto-placed position info */}
                <div style={{ fontSize: 12, color: 'var(--qr-muted)', marginTop: 8 }}>
                  Auto-placed at row {optimalPos.row}, col {optimalPos.col}
                  {constrainedEditorCells.size > 0 && (
                    <span style={{ color: '#e74c3c' }}>
                      {' '}· {constrainedEditorCells.size} pixel{constrainedEditorCells.size > 1 ? 's' : ''} can't be satisfied (shown in red)
                    </span>
                  )}
                </div>
              </>
            )}
          </fieldset>

          {result && (
            <fieldset style={{ border: '1px solid var(--qr-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <legend>Output</legend>
              <div style={{ marginBottom: 8 }}>
                <strong>Decoded URL:</strong>
                <code style={{ display: 'block', padding: 8, background: 'var(--qr-code-bg)', borderRadius: 4, marginTop: 4, wordBreak: 'break-all', fontSize: 12, color: 'var(--qr-fg)' }}>
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
              <button onClick={downloadSVG} style={{ padding: '8px 16px', cursor: 'pointer', background: 'var(--qr-input-bg)', color: 'var(--qr-fg)', border: '1px solid var(--qr-border)', borderRadius: 4 }}>
                Download SVG
              </button>
            </fieldset>
          )}
        </div>

        {/* QR Preview */}
        <div style={{ flex: '1 1 350px', minWidth: 300 }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <h3 style={{ marginTop: 0, color: 'var(--qr-fg)' }}>Preview</h3>
            {svg ? (
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
                style={{ background: 'var(--qr-preview-bg)', padding: 16, borderRadius: 8, border: '1px solid var(--qr-border)' }}
              />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--qr-muted)', border: '1px solid var(--qr-border)', borderRadius: 8 }}>
                Error generating QR code
              </div>
            )}

            {showModuleMap && result && (
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
        background: 'var(--qr-border, #ccc)',
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

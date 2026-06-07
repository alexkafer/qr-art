// Library entry point — exports both the full UI component and low-level engine

// Full UI component
export { QRArtGenerator } from './components/QRArtGenerator'
export type { QRArtGeneratorProps } from './components/QRArtGenerator'

// Engine (for advanced usage)
export { generateQR, generateQRWithArt, findOptimalPosition, gridToSVG } from './qr/engine'
export type { ArtPixel } from './qr/engine'

// Pixel art utilities
export { PIXEL_ARTS, artToPixels, textToPixelArt } from './qr/pixelArt'
export type { PixelArt } from './qr/pixelArt'

// Pixel editor component
export { PixelEditor, createEmptyGrid, resizeGrid } from './components/PixelEditor'

// Types
export type { ErrorCorrectionLevel, QRGrid, QRVersion } from './qr/types'

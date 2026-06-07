# @alexkafer/qr-art

A QR code art generator that embeds pixel art directly into scannable QR codes — not by drawing over them with error correction, but by reverse-engineering the QR encoding pipeline so your art pixels *are* the encoded data.

## How It Works

Traditional "artistic QR codes" work by corrupting a valid QR code and relying on error correction to recover the original data. This approach is fragile — scanners often fail, especially in poor lighting or at angles.

**This tool takes a fundamentally different approach:**

1. **You provide a URL prefix** (e.g., `https://robynandalex.com/`)
2. **You draw pixel art** in the built-in editor (or type text to render with the pixel font)
3. **The reverse pipeline** maps your art pixels to QR data module positions, then computes what raw byte values those pixels encode when XOR'd with the QR mask pattern
4. **The URL suffix is derived from the art** — your pixel art literally becomes part of the URL
5. **The forward pipeline** generates a standards-compliant QR code containing `prefix + art-derived-suffix`

The result: a QR code where the art region contains **valid encoded data**, requiring zero error correction for the art pixels. It scans reliably every time.

### The Key Insight

Each QR data module's visual value = `raw_data_bit XOR mask_bit`. By choosing the right mask and computing suffix bytes that satisfy the art constraints, we make the art pixels valid data rather than corruption.

**EC-L (7% error correction) is best for art** — more data codewords means more art pixels land in the controllable suffix region, requiring fewer (or zero) overlay corrections.

## Installation

```bash
npm install @alexkafer/qr-art
```

Or as a git dependency:

```json
{
  "@alexkafer/qr-art": "github:alexkafer/qr-art"
}
```

## Usage

### Full UI Component

Drop the complete generator into any React app:

```tsx
'use client' // if using Next.js App Router
import { QRArtGenerator } from '@alexkafer/qr-art'

export default function QRArtPage() {
  return (
    <QRArtGenerator
      defaultUrl="https://example.com/"
      defaultVersion={5}
      defaultEcLevel="L"
      showModuleMap={true}
    />
  )
}
```

### Engine Only (Headless)

Use the QR engine directly for programmatic generation:

```ts
import { generateQRWithArt, findOptimalPosition, gridToSVG, textToPixelArt, artToPixels } from '@alexkafer/qr-art'

// Convert text to pixel art
const art = textToPixelArt('HELLO')

// Find optimal placement
const pos = findOptimalPosition('https://example.com/', 5, 'L', art.width, art.height)

// Generate the QR code
const artPixels = artToPixels(art, pos.row, pos.col)
const result = generateQRWithArt({
  urlPrefix: 'https://example.com/',
  version: 5,
  ecLevel: 'L',
  artPixels,
})

// Export as SVG
const svg = gridToSVG(result.grid, 10, 4)
```

## Features

- **Pixel editor** with click/tap and drag-to-paint (mobile-friendly with touch support)
- **Text-to-pixel-art** renderer with full A-Z, 0-9, and symbol (♥♡★∞!?&+) support
- **Auto-placement** finds the optimal position for art (fewest overlay corrections needed)
- **Constraint visualization** shows which pixels can't be satisfied in red
- **White border option** adds contrast around art for readability
- **8 built-in presets** (R♥A, LOVE, I DO, YES!, Rings, Diamond, House, Cheers)
- **SVG export** for print-quality output
- **Per-block RS capacity tracking** prevents exceeding error correction limits

## QR Versions Supported

| Version | Size | Best For |
|---------|------|----------|
| V2 | 25×25 | Tiny art (3-5 chars) |
| V3 | 29×29 | Small art |
| V4 | 33×33 | Medium art |
| V5 | 37×37 | Recommended default |
| V6 | 41×41 | Large art / long text |

## API Reference

### `QRArtGenerator` (React Component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultUrl` | `string` | `'https://robynandalex.com/'` | Initial URL prefix |
| `defaultVersion` | `number` | `5` | QR version (2-6) |
| `defaultEcLevel` | `ErrorCorrectionLevel` | `'L'` | Error correction level |
| `showModuleMap` | `boolean` | `true` | Show the module type debug map |
| `className` | `string` | — | CSS class for root container |

### `generateQRWithArt(options)`

Returns: `{ grid, decodedUrl, suffixBytes, maskPattern, overlayFlips, maxFlips, skippedFlips, constrainedPixels }`

### `findOptimalPosition(urlPrefix, version, ecLevel, artWidth, artHeight)`

Returns: `{ row, col }` — the position with fewest overlay flips needed.

### `textToPixelArt(text)`

Returns: `PixelArt | null` — converts a string to a 5×7 pixel font grid.

### `gridToSVG(grid, moduleSize, quietZone)`

Returns: `string` — SVG markup for the QR code.

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build the library (for npm)
npm run build:lib

# Build the standalone app
npm run build:app

# Type check
npx tsc --noEmit
```

## How the Reverse Pipeline Works (Technical)

1. **Module ordering**: Map each (row, col) in the QR grid to its sequential bit index using the serpentine data placement algorithm
2. **Prefix locking**: The URL prefix occupies bits 0 through `12 + prefix.length × 8` — these are fixed
3. **Suffix region**: Remaining data bits (after prefix, before EC) are free for art to control
4. **Art → raw bits**: For each art pixel at position (r,c), compute `raw_bit = desired_visual XOR mask_bit`
5. **Byte assembly**: Group suffix raw bits into bytes, filling non-art-constrained bits with URL-safe characters (A-Z, a-z, 0-9)
6. **Forward generation**: Encode `prefix + suffix_bytes` through standard QR pipeline (byte mode → RS encoding → interleaving → placement → masking → format info)
7. **Overlay pass**: Any art pixels that landed in prefix or EC regions get flipped post-generation, tracked per RS block to stay within correction capacity

## License

MIT

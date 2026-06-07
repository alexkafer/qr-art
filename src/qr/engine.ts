// Main QR code engine - forward and reverse pipelines

import { type ErrorCorrectionLevel, type QRGrid, getVersion } from './types';
import { computeEC } from './reedSolomon';
import { encodeByteMode } from './encoding';
import {
  createGrid,
  getDataModuleOrder,
  placeDataBits,
  applyMask,
  placeFormatInfo,
  getMaskBit,
} from './placement';

export interface GenerateOptions {
  data: string;
  version: number;
  ecLevel: ErrorCorrectionLevel;
  maskPattern?: number; // 0-7, auto-select if not specified
}

export interface ArtPixel {
  row: number;
  col: number;
  value: 0 | 1; // desired visual appearance (after masking)
}

export interface ReverseOptions {
  urlPrefix: string;
  version: number;
  ecLevel: ErrorCorrectionLevel;
  artPixels: ArtPixel[];
  maskPattern?: number;
}

/**
 * Generate a standard QR code (forward pipeline).
 */
export function generateQR(options: GenerateOptions): QRGrid {
  const { data, version, ecLevel, maskPattern: requestedMask } = options;
  const ver = getVersion(version);

  // Step 1: Encode data
  const dataCodewords = encodeByteMode(data, version, ecLevel);

  // Step 2: Calculate EC
  const ecCodewordsPerBlock = ver.ecCodewordsPerBlock[ecLevel];
  const blockInfo = ver.numBlocks[ecLevel];

  const { interleavedData, interleavedEC } = interleaveBlocks(
    dataCodewords,
    ecCodewordsPerBlock,
    blockInfo
  );

  // Step 3: Combine data + EC into bit stream
  const allCodewords = [...interleavedData, ...interleavedEC];
  const bits = codewordsToBits(allCodewords);

  // Step 4: Create grid and place data
  const grid = createGrid(version);
  placeDataBits(grid, bits);

  // Step 5: Apply mask
  const mask = requestedMask ?? selectBestMask(grid, ecLevel);
  applyMask(grid, mask);

  // Step 6: Place format info
  placeFormatInfo(grid, ecLevel, mask);

  return grid;
}

/**
 * Reverse pipeline: given art pixels and a URL prefix, generate a valid QR code
 * where the art pixels are embedded and the QR decodes to prefix + derived suffix.
 *
 * Clean approach:
 * 1. Map art pixel positions to data bit positions (via serpentine order + mask)
 * 2. Determine which bits fall in the "suffix" range (after prefix, within character data)
 * 3. Compute suffix bytes from art pixel values
 * 4. Forward-generate a valid QR with prefix + suffix
 * 5. Optionally overlay art on non-data modules (EC region) and rely on error correction
 */
export function generateQRWithArt(options: ReverseOptions): {
  grid: QRGrid;
  decodedUrl: string;
  suffixBytes: number[];
  maskPattern: number;
  overlayFlips: number;
  maxFlips: number;
  skippedFlips: number;
  constrainedPixels: Set<string>; // "row,col" of art pixels that couldn't be satisfied
} {
  const { urlPrefix, version, ecLevel, artPixels, maskPattern: requestedMask } = options;
  const ver = getVersion(version);
  const totalDataCodewords = ver.totalDataCodewords[ecLevel];
  const ecCodewordsPerBlock = ver.ecCodewordsPerBlock[ecLevel];
  const blockInfo = ver.numBlocks[ecLevel];

  const masksToTry = requestedMask !== undefined ? [requestedMask] : [0, 1, 2, 3, 4, 5, 6, 7];

  let bestResult: { grid: QRGrid; decodedUrl: string; suffixBytes: number[]; maskPattern: number; artMatch: number; overlayFlips: number; maxFlips: number; skippedFlips: number; constrainedPixels: Set<string> } | null = null;

  for (const mask of masksToTry) {
    const result = buildArtQR(
      urlPrefix, version, ecLevel, artPixels, mask,
      totalDataCodewords, ecCodewordsPerBlock, blockInfo
    );
    // Score: prefer all-ASCII suffix, then fewer non-ASCII, then more art match, then fewer overlay flips
    const nonAsciiCount = result.suffixBytes.filter(b => b > 127).length;
    const isBetter = !bestResult ||
      nonAsciiCount < bestResult.suffixBytes.filter(b => b > 127).length ||
      (nonAsciiCount === bestResult.suffixBytes.filter(b => b > 127).length && (
        result.artMatch > bestResult.artMatch ||
        (result.artMatch === bestResult.artMatch && result.overlayFlips < bestResult.overlayFlips)
      ));
    if (isBetter) {
      bestResult = { ...result, maskPattern: mask };
    }
  }

  return bestResult!;
}

/**
 * Find the optimal position for art within the QR grid.
 * Tries all valid positions and returns the one with fewest overlay flips.
 * Uses a fast pre-check to avoid expensive full QR generation for bad positions.
 * @param occupiedCells - Set of "row,col" keys already claimed by higher-priority art layers
 */
export function findOptimalPosition(
  urlPrefix: string,
  version: number,
  ecLevel: ErrorCorrectionLevel,
  artWidth: number,
  artHeight: number,
  occupiedCells?: Set<string>,
): { row: number; col: number } | null {
  const ver = getVersion(version);
  const size = ver.size;
  const totalDataCodewords = ver.totalDataCodewords[ecLevel];

  // Pre-compute data module order and prefix bit range
  const templateGrid = createGrid(version);
  const moduleOrder = getDataModuleOrder(templateGrid);
  const dataBitCount = totalDataCodewords * 8;
  const prefixBitEnd = 12 + urlPrefix.length * 8;

  // Build position → bit index lookup
  const positionToBitIndex = new Map<string, number>();
  moduleOrder.forEach(([r, c], idx) => {
    positionToBitIndex.set(`${r},${c}`, idx);
  });

  // Function pattern positions to avoid
  const functionModules = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (templateGrid.types[r][c] !== 'data') {
        functionModules.add(`${r},${c}`);
      }
    }
  }

  let bestPos: { row: number; col: number } | null = null;
  let bestScore = -Infinity;

  for (let row = 0; row <= size - artHeight; row++) {
    for (let col = 0; col <= size - artWidth; col++) {
      let inSuffix = 0;
      let inFunction = 0;
      let inOccupied = 0;

      for (let r = 0; r < artHeight; r++) {
        for (let c = 0; c < artWidth; c++) {
          const pr = row + r;
          const pc = col + c;
          const key = `${pr},${pc}`;

          if (functionModules.has(key)) {
            inFunction++;
            continue;
          }

          if (occupiedCells?.has(key)) {
            inOccupied++;
            continue;
          }

          const bitIdx = positionToBitIndex.get(key);
          if (bitIdx !== undefined && bitIdx >= prefixBitEnd && bitIdx < dataBitCount) {
            inSuffix++;
          }
        }
      }

      // Avoid positions that overlap function patterns or occupied cells
      if (inFunction > 0 || inOccupied > 0) continue;

      // Score: more suffix pixels = better (fewer overlays needed)
      // Tiebreak: prefer positions closer to center
      const centerDist = Math.abs(row + artHeight/2 - size/2) + Math.abs(col + artWidth/2 - size/2);
      const score = inSuffix * 1000 - centerDist;

      if (score > bestScore) {
        bestScore = score;
        bestPos = { row, col };
      }
    }
  }

  return bestPos;
}

// URL-safe characters for path segments: A-Z, a-z, 0-9, -, _, ., ~
const URL_SAFE_CHARS: number[] = [];
for (let c = 0x41; c <= 0x5A; c++) URL_SAFE_CHARS.push(c); // A-Z
for (let c = 0x61; c <= 0x7A; c++) URL_SAFE_CHARS.push(c); // a-z
for (let c = 0x30; c <= 0x39; c++) URL_SAFE_CHARS.push(c); // 0-9
URL_SAFE_CHARS.push(0x2D, 0x5F, 0x2E, 0x7E); // - _ . ~

/**
 * Find a URL-safe byte value that satisfies art bit constraints.
 * constrainedMask: bitmask of which bits are locked by art
 * constrainedValue: required values for those bits
 * Returns the best URL-safe char, or a printable fallback.
 */
function findUrlSafeChar(constrainedMask: number, constrainedValue: number): number {
  // Try URL-safe characters first
  for (const ch of URL_SAFE_CHARS) {
    if ((ch & constrainedMask) === constrainedValue) return ch;
  }
  // Fallback: try all printable ASCII (0x21-0x7E, skip space)
  for (let ch = 0x21; ch <= 0x7E; ch++) {
    if ((ch & constrainedMask) === constrainedValue) return ch;
  }
  // Last resort: any non-null byte
  for (let ch = 1; ch <= 255; ch++) {
    if ((ch & constrainedMask) === constrainedValue) return ch;
  }
  // Truly impossible (all 8 bits constrained to 0) — return the constrained value
  return constrainedValue;
}

function buildArtQR(
  urlPrefix: string,
  version: number,
  ecLevel: ErrorCorrectionLevel,
  artPixels: ArtPixel[],
  mask: number,
  totalDataCodewords: number,
  ecCodewordsPerBlock: number,
  blockInfo: { group1: [number, number]; group2?: [number, number] }
): { grid: QRGrid; decodedUrl: string; suffixBytes: number[]; artMatch: number; overlayFlips: number; maxFlips: number; skippedFlips: number; constrainedPixels: Set<string> } {
  // Step 1: Get the module order and build position→bitIndex mapping
  const templateGrid = createGrid(version);
  const moduleOrder = getDataModuleOrder(templateGrid);
  const positionToBitIndex = new Map<string, number>();
  moduleOrder.forEach(([r, c], idx) => {
    positionToBitIndex.set(`${r},${c}`, idx);
  });

  // Step 2: Build interleave mapping (to map interleaved bit indices to sequential codeword positions)
  const dummyData = new Array(totalDataCodewords).fill(0);
  const { dataBlockMap } = interleaveBlocksWithMap(dummyData, ecCodewordsPerBlock, blockInfo);

  const dataBitCount = totalDataCodewords * 8;

  // Step 3: Calculate data layout
  // Byte mode: bits 0-3 = mode(0100), bits 4-11 = charCount, bits 12+ = data bytes
  // Max chars that fully fit: floor((dataBitCount - 12) / 8)
  // We also need room for terminator (up to 4 bits) but it can be truncated
  const maxCharCount = Math.floor((dataBitCount - 12) / 8);
  const prefixBitEnd = 12 + urlPrefix.length * 8; // exclusive

  // Step 4: For each art pixel, determine what sequential data bit it maps to
  // and compute what raw bit value the art needs
  const artBitMap: { seqBitIndex: number; rawValue: 0 | 1 }[] = [];

  for (const pixel of artPixels) {
    const key = `${pixel.row},${pixel.col}`;
    const bitIndex = positionToBitIndex.get(key);
    if (bitIndex === undefined || bitIndex >= dataBitCount) continue;

    // Un-mask: raw bit = visual value XOR mask value
    const maskBit = getMaskBit(mask, pixel.row, pixel.col);
    const rawValue = (pixel.value ^ maskBit) as 0 | 1;

    // Map interleaved bit index to sequential codeword + bit
    const interleavedCWIndex = Math.floor(bitIndex / 8);
    const bitWithinCW = 7 - (bitIndex % 8); // MSB first

    if (interleavedCWIndex >= dataBlockMap.length) continue;
    const mapping = dataBlockMap[interleavedCWIndex];

    const { blockIndex, posInBlock } = mapping;
    const g1Count = blockInfo.group1[0];
    const g1Size = blockInfo.group1[1];
    let seqIndex: number;
    if (blockIndex < g1Count) {
      seqIndex = blockIndex * g1Size + posInBlock;
    } else {
      seqIndex = g1Count * g1Size + (blockIndex - g1Count) * (blockInfo.group2?.[1] ?? 0) + posInBlock;
    }
    const seqBitIndex = seqIndex * 8 + (7 - bitWithinCW);

    artBitMap.push({ seqBitIndex, rawValue });
  }

  // Step 5: Find the range of suffix bytes affected by art
  let maxSuffixBit = prefixBitEnd - 1;
  for (const { seqBitIndex } of artBitMap) {
    if (seqBitIndex >= prefixBitEnd && seqBitIndex > maxSuffixBit) {
      maxSuffixBit = seqBitIndex;
    }
  }

  // Suffix char count: how many full bytes of suffix we need
  const lastCharIndex = Math.floor((maxSuffixBit - 12) / 8);
  const totalCharCount = Math.min(lastCharIndex + 1, maxCharCount);
  const suffixLength = Math.max(0, totalCharCount - urlPrefix.length);

  // Step 6: Build suffix bytes from art pixel data
  // Track which bits in each suffix byte are constrained by art
  const suffixConstraints: { mask: number; value: number }[] = Array.from(
    { length: suffixLength },
    () => ({ mask: 0, value: 0 })
  );

  for (const { seqBitIndex, rawValue } of artBitMap) {
    const charIndex = Math.floor((seqBitIndex - 12) / 8);
    const bitInChar = 7 - ((seqBitIndex - 12) % 8);

    if (charIndex < urlPrefix.length) continue; // prefix bit — skip
    if (charIndex >= totalCharCount) continue;   // beyond capacity — skip

    const suffixIndex = charIndex - urlPrefix.length;
    if (suffixIndex >= 0 && suffixIndex < suffixLength) {
      suffixConstraints[suffixIndex].mask |= (1 << bitInChar);
      if (rawValue) {
        suffixConstraints[suffixIndex].value |= (1 << bitInChar);
      }
    }
  }

  // For each suffix byte, find a URL-safe character that satisfies art constraints.
  // URL-safe path chars: A-Z, a-z, 0-9, -, _, ., ~
  const suffixBytes = new Uint8Array(suffixLength);
  for (let i = 0; i < suffixLength; i++) {
    const { mask: constrainedMask, value: constrainedValue } = suffixConstraints[i];
    suffixBytes[i] = findUrlSafeChar(constrainedMask, constrainedValue);
  }

  // Step 7: Build full URL and generate forward QR
  const suffix = Array.from(suffixBytes).map(b => String.fromCharCode(b)).join('');
  const fullUrl = urlPrefix + suffix;

  const grid = generateQR({
    data: fullUrl,
    version,
    ecLevel,
    maskPattern: mask,
  });

  // Step 8: Count art match
  let artMatch = 0;
  for (const pixel of artPixels) {
    if (pixel.row < grid.size && pixel.col < grid.size) {
      if (grid.modules[pixel.row][pixel.col] === pixel.value) {
        artMatch++;
      }
    }
  }

  // Step 9: Overlay art pixels that don't match the forward QR.
  // Track which codewords are damaged per RS block to stay within correction capacity.
  const ver = getVersion(version);
  const ecCWPerBlock = ver.ecCodewordsPerBlock[ecLevel];
  const numBlocks = blockInfo.group1[0] + (blockInfo.group2?.[0] ?? 0);
  const correctablePerBlock = Math.floor(ecCWPerBlock / 2);

  // Build a map from module position → interleaved codeword index
  const posToInterleavedCW = new Map<string, number>();
  moduleOrder.forEach(([r, c], idx) => {
    posToInterleavedCW.set(`${r},${c}`, Math.floor(idx / 8));
  });

  const ecOverlayGrid = {
    size: grid.size,
    modules: grid.modules.map(row => [...row]),
    types: grid.types.map(row => [...row]),
  } as QRGrid;

  // Track damaged codewords per block
  const damagedCWPerBlock = new Map<number, Set<number>>();
  for (let b = 0; b < numBlocks; b++) damagedCWPerBlock.set(b, new Set());

  let ecFlips = 0;
  let skippedFlips = 0;
  const constrainedPixels = new Set<string>();

  for (const pixel of artPixels) {
    if (pixel.row >= grid.size || pixel.col >= grid.size) continue;
    if (ecOverlayGrid.modules[pixel.row][pixel.col] === pixel.value) continue;

    // Determine which interleaved codeword this module belongs to
    const key = `${pixel.row},${pixel.col}`;
    const interleavedCW = posToInterleavedCW.get(key);
    if (interleavedCW === undefined) continue; // not a data module

    // Determine which block this codeword belongs to
    let blockIdx: number;
    if (interleavedCW < dataBlockMap.length) {
      blockIdx = dataBlockMap[interleavedCW].blockIndex;
    } else {
      // EC region — map via ecBlockMap if available, otherwise estimate
      const ecIdx = interleavedCW - dataBlockMap.length;
      if (ecIdx < numBlocks * ecCWPerBlock) {
        blockIdx = ecIdx % numBlocks; // EC codewords are interleaved by block
      } else {
        blockIdx = 0;
      }
    }

    const blockDamaged = damagedCWPerBlock.get(blockIdx)!;
    const wouldDamage = !blockDamaged.has(interleavedCW);

    // Check if adding this damage would exceed the block's RS capacity
    if (wouldDamage && blockDamaged.size >= correctablePerBlock) {
      skippedFlips++;
      constrainedPixels.add(key);
      continue; // skip this flip — would exceed capacity
    }

    ecOverlayGrid.modules[pixel.row][pixel.col] = pixel.value;
    blockDamaged.add(interleavedCW);
    ecFlips++;
  }

  const maxFlips = correctablePerBlock * numBlocks;

  // Use overlay if we applied any flips (capacity is already enforced per-block above)
  const useOverlay = ecFlips > 0;
  const finalGrid = useOverlay ? ecOverlayGrid : grid;

  // Count actual art match on final grid
  let finalArtMatch = 0;
  for (const pixel of artPixels) {
    if (pixel.row < finalGrid.size && pixel.col < finalGrid.size) {
      if (finalGrid.modules[pixel.row][pixel.col] === pixel.value) finalArtMatch++;
    }
  }

  return {
    grid: finalGrid,
    decodedUrl: fullUrl,
    suffixBytes: Array.from(suffixBytes),
    artMatch: finalArtMatch,
    overlayFlips: ecFlips,
    maxFlips,
    skippedFlips,
    constrainedPixels,
  };
}

function interleaveBlocksWithMap(
  dataCodewords: number[],
  ecCodewordsPerBlock: number,
  blockInfo: { group1: [number, number]; group2?: [number, number] }
): {
  interleavedData: number[];
  interleavedEC: number[];
  dataBlockMap: { blockIndex: number; posInBlock: number }[];
  ecBlockMap: { blockIndex: number; posInBlock: number }[];
} {
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;

  const [g1Count, g1DataCW] = blockInfo.group1;
  for (let i = 0; i < g1Count; i++) {
    const blockData = dataCodewords.slice(offset, offset + g1DataCW);
    offset += g1DataCW;
    const ec = computeEC(blockData, ecCodewordsPerBlock);
    blocks.push({ data: blockData, ec });
  }

  if (blockInfo.group2) {
    const [g2Count, g2DataCW] = blockInfo.group2;
    for (let i = 0; i < g2Count; i++) {
      const blockData = dataCodewords.slice(offset, offset + g2DataCW);
      offset += g2DataCW;
      const ec = computeEC(blockData, ecCodewordsPerBlock);
      blocks.push({ data: blockData, ec });
    }
  }

  const maxDataLen = Math.max(...blocks.map((b) => b.data.length));
  const interleavedData: number[] = [];
  const dataBlockMap: { blockIndex: number; posInBlock: number }[] = [];

  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < blocks[b].data.length) {
        interleavedData.push(blocks[b].data[i]);
        dataBlockMap.push({ blockIndex: b, posInBlock: i });
      }
    }
  }

  const interleavedEC: number[] = [];
  const ecBlockMap: { blockIndex: number; posInBlock: number }[] = [];

  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < blocks[b].ec.length) {
        interleavedEC.push(blocks[b].ec[i]);
        ecBlockMap.push({ blockIndex: b, posInBlock: i });
      }
    }
  }

  return { interleavedData, interleavedEC, dataBlockMap, ecBlockMap };
}

function interleaveBlocks(
  dataCodewords: number[],
  ecCodewordsPerBlock: number,
  blockInfo: { group1: [number, number]; group2?: [number, number] }
): { interleavedData: number[]; interleavedEC: number[] } {
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;

  // Group 1 blocks
  const [g1Count, g1DataCW] = blockInfo.group1;
  for (let i = 0; i < g1Count; i++) {
    const blockData = dataCodewords.slice(offset, offset + g1DataCW);
    offset += g1DataCW;
    const ec = computeEC(blockData, ecCodewordsPerBlock);
    blocks.push({ data: blockData, ec });
  }

  // Group 2 blocks (if any)
  if (blockInfo.group2) {
    const [g2Count, g2DataCW] = blockInfo.group2;
    for (let i = 0; i < g2Count; i++) {
      const blockData = dataCodewords.slice(offset, offset + g2DataCW);
      offset += g2DataCW;
      const ec = computeEC(blockData, ecCodewordsPerBlock);
      blocks.push({ data: blockData, ec });
    }
  }

  // Interleave data codewords
  const maxDataLen = Math.max(...blocks.map((b) => b.data.length));
  const interleavedData: number[] = [];
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.data.length) {
        interleavedData.push(block.data[i]);
      }
    }
  }

  // Interleave EC codewords
  const interleavedEC: number[] = [];
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    for (const block of blocks) {
      if (i < block.ec.length) {
        interleavedEC.push(block.ec[i]);
      }
    }
  }

  return { interleavedData, interleavedEC };
}

function codewordsToBits(codewords: number[]): number[] {
  const bits: number[] = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) {
      bits.push((cw >> i) & 1);
    }
  }
  return bits;
}

/**
 * Evaluate mask penalty score (simplified).
 */
function selectBestMask(baseGrid: QRGrid, ecLevel: ErrorCorrectionLevel): number {
  let bestMask = 0;
  let bestScore = Infinity;

  for (let mask = 0; mask < 8; mask++) {
    const grid = cloneGrid(baseGrid);
    applyMask(grid, mask);
    placeFormatInfo(grid, ecLevel, mask);
    const score = evaluatePenalty(grid);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
  }

  return bestMask;
}

function cloneGrid(grid: QRGrid): QRGrid {
  return {
    size: grid.size,
    modules: grid.modules.map((row) => [...row]),
    types: grid.types.map((row) => [...row]),
  };
}

function evaluatePenalty(grid: QRGrid): number {
  // Simplified penalty: count runs of same color
  let penalty = 0;
  const { size, modules } = grid;

  // Rule 1: Consecutive same-color modules in rows/columns
  for (let row = 0; row < size; row++) {
    let count = 1;
    for (let col = 1; col < size; col++) {
      if (modules[row][col] === modules[row][col - 1]) {
        count++;
      } else {
        if (count >= 5) penalty += count - 2;
        count = 1;
      }
    }
    if (count >= 5) penalty += count - 2;
  }

  for (let col = 0; col < size; col++) {
    let count = 1;
    for (let row = 1; row < size; row++) {
      if (modules[row][col] === modules[row - 1][col]) {
        count++;
      } else {
        if (count >= 5) penalty += count - 2;
        count = 1;
      }
    }
    if (count >= 5) penalty += count - 2;
  }

  return penalty;
}

/**
 * Export QR grid as SVG string.
 */
export function gridToSVG(grid: QRGrid, moduleSize: number = 10, quiet: number = 4): string {
  const totalSize = (grid.size + quiet * 2) * moduleSize;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;

  for (let row = 0; row < grid.size; row++) {
    for (let col = 0; col < grid.size; col++) {
      if (grid.modules[row][col] === 1) {
        const x = (col + quiet) * moduleSize;
        const y = (row + quiet) * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

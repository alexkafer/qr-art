// QR code module placement: function patterns and data module mapping

import { type QRGrid, type Module, type ModuleType, type ErrorCorrectionLevel, getVersion, EC_LEVEL_BITS } from './types';

/**
 * Create an empty QR grid with all function patterns placed.
 */
export function createGrid(version: number): QRGrid {
  const ver = getVersion(version);
  const size = ver.size;
  const modules: Module[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const types: ModuleType[][] = Array.from({ length: size }, () => new Array<ModuleType>(size).fill('data'));

  // Place finder patterns (7x7 at three corners)
  placeFinderPattern(modules, types, 0, 0);
  placeFinderPattern(modules, types, 0, size - 7);
  placeFinderPattern(modules, types, size - 7, 0);

  // Place separators (1-module white border around finder patterns)
  placeSeparators(modules, types, size);

  // Place timing patterns
  placeTimingPatterns(modules, types, size);

  // Place alignment patterns
  if (ver.alignmentPatternPositions.length > 0) {
    placeAlignmentPatterns(modules, types, ver.alignmentPatternPositions, size);
  }

  // Dark module (always at [4 * version + 9, 8])
  const darkRow = 4 * version + 9;
  modules[darkRow][8] = 1;
  types[darkRow][8] = 'dark';

  // Reserve format info areas (will be filled later)
  reserveFormatInfo(types, size);

  return { size, modules, types };
}

function placeFinderPattern(modules: Module[][], types: ModuleType[][], startRow: number, startCol: number) {
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      modules[startRow + r][startCol + c] = pattern[r][c] as Module;
      types[startRow + r][startCol + c] = 'finder';
    }
  }
}

function placeSeparators(modules: Module[][], types: ModuleType[][], size: number) {
  // Horizontal and vertical separators around all three finder patterns
  for (let i = 0; i < 8; i++) {
    // Top-left: right and bottom edges
    setSep(modules, types, 7, i, size);
    setSep(modules, types, i, 7, size);
    // Top-right: left and bottom edges
    setSep(modules, types, 7, size - 8 + i, size);
    setSep(modules, types, i, size - 8, size);
    // Bottom-left: right and top edges
    setSep(modules, types, size - 8, i, size);
    setSep(modules, types, size - 8 + i, 7, size);
  }
}

function setSep(modules: Module[][], types: ModuleType[][], row: number, col: number, size: number) {
  if (row >= 0 && row < size && col >= 0 && col < size && types[row][col] !== 'finder') {
    modules[row][col] = 0;
    types[row][col] = 'separator';
  }
}

function placeTimingPatterns(modules: Module[][], types: ModuleType[][], size: number) {
  for (let i = 8; i < size - 8; i++) {
    // Horizontal timing (row 6)
    if (types[6][i] === 'data') {
      modules[6][i] = (i % 2 === 0 ? 1 : 0) as Module;
      types[6][i] = 'timing';
    }
    // Vertical timing (col 6)
    if (types[i][6] === 'data') {
      modules[i][6] = (i % 2 === 0 ? 1 : 0) as Module;
      types[i][6] = 'timing';
    }
  }
}

function placeAlignmentPatterns(
  modules: Module[][],
  types: ModuleType[][],
  positions: number[],
  size: number
) {
  const pattern = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];

  for (const row of positions) {
    for (const col of positions) {
      // Skip if it overlaps a finder pattern
      const centerRow = row;
      const centerCol = col;
      if (
        (centerRow <= 8 && centerCol <= 8) ||
        (centerRow <= 8 && centerCol >= size - 8) ||
        (centerRow >= size - 8 && centerCol <= 8)
      ) {
        continue;
      }

      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          modules[centerRow + r][centerCol + c] = pattern[r + 2][c + 2] as Module;
          types[centerRow + r][centerCol + c] = 'alignment';
        }
      }
    }
  }
}

function reserveFormatInfo(types: ModuleType[][], size: number) {
  // Around top-left finder pattern
  for (let i = 0; i <= 8; i++) {
    if (types[8][i] === 'data') types[8][i] = 'format';
    if (types[i][8] === 'data') types[i][8] = 'format';
  }
  // Below top-right finder pattern
  for (let i = 0; i <= 7; i++) {
    if (types[8][size - 1 - i] === 'data') types[8][size - 1 - i] = 'format';
  }
  // Right of bottom-left finder pattern
  for (let i = 0; i <= 7; i++) {
    if (types[size - 1 - i][8] === 'data') types[size - 1 - i][8] = 'format';
  }
}

/**
 * Get the data module positions in placement order (serpentine pattern).
 * Returns array of [row, col] pairs in the order data bits should be placed.
 */
export function getDataModuleOrder(grid: QRGrid): [number, number][] {
  const { size, types } = grid;
  const order: [number, number][] = [];

  // Start from the right, move left in pairs of columns
  let col = size - 1;
  let upward = true;

  while (col >= 0) {
    // Skip column 6 (timing pattern)
    if (col === 6) {
      col--;
      continue;
    }

    const leftCol = col - 1 < 0 ? col : col - 1;
    if (leftCol === 6) {
      // The pair straddles the timing column; use col and col-2
      // Actually, when we hit column 7, pair is (7, 5) — skip col 6
    }

    if (upward) {
      for (let row = size - 1; row >= 0; row--) {
        // Right column of the pair
        if (types[row][col] === 'data') {
          order.push([row, col]);
        }
        // Left column of the pair
        const lc = col - 1;
        if (lc >= 0 && lc !== 6 && types[row][lc] === 'data') {
          order.push([row, lc]);
        }
      }
    } else {
      for (let row = 0; row < size; row++) {
        if (types[row][col] === 'data') {
          order.push([row, col]);
        }
        const lc = col - 1;
        if (lc >= 0 && lc !== 6 && types[row][lc] === 'data') {
          order.push([row, lc]);
        }
      }
    }

    upward = !upward;
    col -= 2;
    // Skip column 6
    if (col === 6) col--;
  }

  return order;
}

/**
 * Place data bits into the grid following serpentine order.
 */
export function placeDataBits(grid: QRGrid, bits: number[]): void {
  const order = getDataModuleOrder(grid);
  for (let i = 0; i < order.length && i < bits.length; i++) {
    const [row, col] = order[i];
    grid.modules[row][col] = bits[i] as Module;
  }
}

// 8 QR mask patterns
const MASK_FUNCTIONS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r, _) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * Apply a mask pattern to data modules (XOR).
 */
export function applyMask(grid: QRGrid, maskPattern: number): void {
  const fn = MASK_FUNCTIONS[maskPattern];
  for (let row = 0; row < grid.size; row++) {
    for (let col = 0; col < grid.size; col++) {
      if (grid.types[row][col] === 'data') {
        if (fn(row, col)) {
          grid.modules[row][col] = (grid.modules[row][col] ^ 1) as Module;
        }
      }
    }
  }
}

/**
 * Get the mask function value at a position.
 */
export function getMaskBit(maskPattern: number, row: number, col: number): number {
  return MASK_FUNCTIONS[maskPattern](row, col) ? 1 : 0;
}

// Format information encoding

// Precompute format info for all EC level + mask combinations
function computeFormatInfo(ecLevel: ErrorCorrectionLevel, maskPattern: number): number {
  const ecBits = EC_LEVEL_BITS[ecLevel];
  let data = (ecBits << 3) | maskPattern;

  // BCH(15,5) encoding
  let bits = data << 10;
  const generator = 0b10100110111; // x^10 + x^8 + x^5 + x^4 + x^2 + x + 1

  for (let i = 14; i >= 10; i--) {
    if (bits & (1 << i)) {
      bits ^= generator << (i - 10);
    }
  }

  const formatInfo = (data << 10) | bits;

  // XOR with mask pattern 101010000010010
  return formatInfo ^ 0b101010000010010;
}

/**
 * Place format information into the grid.
 */
export function placeFormatInfo(grid: QRGrid, ecLevel: ErrorCorrectionLevel, maskPattern: number): void {
  const formatInfo = computeFormatInfo(ecLevel, maskPattern);
  const { size, modules } = grid;

  // Bit positions around top-left finder pattern
  // Standard specifies exact bit positions:

  // Around top-left: bits 0-7 go in specific positions
  const topLeftH: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
  ];
  const topLeftV: [number, number][] = [
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];

  // Bit 0 is MSB of format info (bit 14 of the 15-bit string)
  for (let i = 0; i <= 7; i++) {
    const bit = (formatInfo >> (14 - i)) & 1;
    const [r, c] = topLeftH[i];
    modules[r][c] = bit as Module;
  }
  for (let i = 0; i <= 6; i++) {
    const bit = (formatInfo >> (6 - i)) & 1;
    const [r, c] = topLeftV[i];
    modules[r][c] = bit as Module;
  }

  // Second copy: next to top-right finder (horizontal) and bottom-left finder (vertical)
  // Top-right: row 8, columns (size-1) to (size-8), bits 0-7
  for (let i = 0; i <= 7; i++) {
    const bit = (formatInfo >> i) & 1;
    modules[8][size - 1 - i] = bit as Module;
  }
  // Bottom-left: col 8, rows (size-1) to (size-7), bits 8-14
  for (let i = 0; i <= 6; i++) {
    const bit = (formatInfo >> (8 + i)) & 1;
    modules[size - 1 - i][8] = bit as Module;
  }
}

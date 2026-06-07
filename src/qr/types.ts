// QR Code types and constants

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type Module = 0 | 1; // 0 = light, 1 = dark

export type ModuleType = 
  | 'finder'
  | 'separator' 
  | 'timing'
  | 'alignment'
  | 'format'
  | 'version'
  | 'dark'       // the single dark module
  | 'data';      // data + EC modules

export interface QRGrid {
  size: number;
  modules: Module[][];       // 0/1 values
  types: ModuleType[][];     // what each module is
}

export interface QRVersion {
  version: number;
  size: number;  // modules per side
  alignmentPatternPositions: number[];
  totalDataCodewords: Record<ErrorCorrectionLevel, number>;
  ecCodewordsPerBlock: Record<ErrorCorrectionLevel, number>;
  numBlocks: Record<ErrorCorrectionLevel, { group1: [number, number]; group2?: [number, number] }>;
}

// EC level indicators for format info
export const EC_LEVEL_BITS: Record<ErrorCorrectionLevel, number> = {
  L: 0b01,
  M: 0b00,
  Q: 0b11,
  H: 0b10,
};

// QR versions 1-6 (we'll focus on 2-5 for this use case)
export const QR_VERSIONS: QRVersion[] = [
  // Version 1: 21x21
  {
    version: 1, size: 21, alignmentPatternPositions: [],
    totalDataCodewords: { L: 19, M: 16, Q: 13, H: 9 },
    ecCodewordsPerBlock: { L: 7, M: 10, Q: 13, H: 17 },
    numBlocks: {
      L: { group1: [1, 19] },
      M: { group1: [1, 16] },
      Q: { group1: [1, 13] },
      H: { group1: [1, 9] },
    },
  },
  // Version 2: 25x25
  {
    version: 2, size: 25, alignmentPatternPositions: [6, 18],
    totalDataCodewords: { L: 34, M: 28, Q: 22, H: 16 },
    ecCodewordsPerBlock: { L: 10, M: 16, Q: 22, H: 28 },
    numBlocks: {
      L: { group1: [1, 34] },
      M: { group1: [1, 28] },
      Q: { group1: [1, 22] },
      H: { group1: [1, 16] },
    },
  },
  // Version 3: 29x29
  {
    version: 3, size: 29, alignmentPatternPositions: [6, 22],
    totalDataCodewords: { L: 55, M: 44, Q: 34, H: 26 },
    ecCodewordsPerBlock: { L: 15, M: 26, Q: 18, H: 22 },
    numBlocks: {
      L: { group1: [1, 55] },
      M: { group1: [1, 44] },
      Q: { group1: [2, 17] },
      H: { group1: [2, 13] },
    },
  },
  // Version 4: 33x33
  {
    version: 4, size: 33, alignmentPatternPositions: [6, 26],
    totalDataCodewords: { L: 80, M: 64, Q: 48, H: 36 },
    ecCodewordsPerBlock: { L: 20, M: 18, Q: 26, H: 16 },
    numBlocks: {
      L: { group1: [1, 80] },
      M: { group1: [2, 32] },
      Q: { group1: [2, 24] },
      H: { group1: [4, 9] },
    },
  },
  // Version 5: 37x37
  {
    version: 5, size: 37, alignmentPatternPositions: [6, 30],
    totalDataCodewords: { L: 108, M: 86, Q: 62, H: 46 },
    ecCodewordsPerBlock: { L: 26, M: 24, Q: 18, H: 22 },
    numBlocks: {
      L: { group1: [1, 108] },
      M: { group1: [2, 43] },
      Q: { group1: [2, 15], group2: [2, 16] },
      H: { group1: [2, 11], group2: [2, 12] },
    },
  },
  // Version 6: 41x41
  {
    version: 6, size: 41, alignmentPatternPositions: [6, 34],
    totalDataCodewords: { L: 136, M: 108, Q: 76, H: 60 },
    ecCodewordsPerBlock: { L: 18, M: 16, Q: 24, H: 28 },
    numBlocks: {
      L: { group1: [2, 68] },
      M: { group1: [4, 27] },
      Q: { group1: [4, 19] },
      H: { group1: [4, 15] },
    },
  },
];

export function getVersion(v: number): QRVersion {
  const ver = QR_VERSIONS[v - 1];
  if (!ver) throw new Error(`QR version ${v} not supported`);
  return ver;
}

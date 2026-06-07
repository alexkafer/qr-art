// QR code data encoding (byte mode)

import { type ErrorCorrectionLevel, getVersion } from './types';

/**
 * Encode a string as QR byte-mode data codewords.
 * Returns padded codewords ready for EC calculation.
 */
export function encodeByteMode(
  data: string,
  version: number,
  ecLevel: ErrorCorrectionLevel
): number[] {
  const ver = getVersion(version);
  const totalDataCodewords = ver.totalDataCodewords[ecLevel];

  // Byte mode indicator: 0100
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);

  // Character count indicator (8 bits for versions 1-9)
  pushBits(bits, data.length, 8);

  // Data bytes
  for (let i = 0; i < data.length; i++) {
    pushBits(bits, data.charCodeAt(i), 8);
  }

  // Terminator (up to 4 zero bits)
  const totalDataBits = totalDataCodewords * 8;
  const terminatorLength = Math.min(4, totalDataBits - bits.length);
  pushBits(bits, 0, terminatorLength);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Convert to bytes
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] || 0);
    }
    codewords.push(byte);
  }

  // Pad with alternating 0xEC, 0x11
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (codewords.length < totalDataCodewords) {
    codewords.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  return codewords;
}

function pushBits(bits: number[], value: number, count: number) {
  for (let i = count - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
}

/**
 * Decode codewords back to the encoded string (for verifying reverse pipeline).
 */
export function decodeByteMode(codewords: number[]): string {
  // Convert codewords to bit array
  const bits: number[] = [];
  for (const cw of codewords) {
    for (let i = 7; i >= 0; i--) {
      bits.push((cw >> i) & 1);
    }
  }

  // Read mode indicator (4 bits)
  const mode = readBits(bits, 0, 4);
  if (mode !== 0b0100) {
    return `[unknown mode: ${mode}]`;
  }

  // Character count (8 bits for versions 1-9)
  const charCount = readBits(bits, 4, 8);

  // Read data bytes
  let result = '';
  for (let i = 0; i < charCount; i++) {
    const byte = readBits(bits, 12 + i * 8, 8);
    result += String.fromCharCode(byte);
  }

  return result;
}

function readBits(bits: number[], offset: number, count: number): number {
  let value = 0;
  for (let i = 0; i < count; i++) {
    value = (value << 1) | (bits[offset + i] || 0);
  }
  return value;
}

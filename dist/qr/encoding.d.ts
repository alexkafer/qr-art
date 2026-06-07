import { type ErrorCorrectionLevel } from './types';
/**
 * Encode a string as QR byte-mode data codewords.
 * Returns padded codewords ready for EC calculation.
 */
export declare function encodeByteMode(data: string, version: number, ecLevel: ErrorCorrectionLevel): number[];
/**
 * Decode codewords back to the encoded string (for verifying reverse pipeline).
 */
export declare function decodeByteMode(codewords: number[]): string;

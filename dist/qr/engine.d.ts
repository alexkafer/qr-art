import { type ErrorCorrectionLevel, type QRGrid } from './types';
export interface GenerateOptions {
    data: string;
    version: number;
    ecLevel: ErrorCorrectionLevel;
    maskPattern?: number;
}
export interface ArtPixel {
    row: number;
    col: number;
    value: 0 | 1;
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
export declare function generateQR(options: GenerateOptions): QRGrid;
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
export declare function generateQRWithArt(options: ReverseOptions): {
    grid: QRGrid;
    decodedUrl: string;
    suffixBytes: number[];
    maskPattern: number;
    overlayFlips: number;
    maxFlips: number;
    skippedFlips: number;
    constrainedPixels: Set<string>;
};
/**
 * Find the optimal position for art within the QR grid.
 * Tries all valid positions and returns the one with fewest overlay flips.
 * Uses a fast pre-check to avoid expensive full QR generation for bad positions.
 * @param occupiedCells - Set of "row,col" keys already claimed by higher-priority art layers
 */
export declare function findOptimalPosition(urlPrefix: string, version: number, ecLevel: ErrorCorrectionLevel, artWidth: number, artHeight: number, occupiedCells?: Set<string>): {
    row: number;
    col: number;
} | null;
/**
 * Export QR grid as SVG string.
 */
export declare function gridToSVG(grid: QRGrid, moduleSize?: number, quiet?: number): string;

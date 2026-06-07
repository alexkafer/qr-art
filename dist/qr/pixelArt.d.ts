export interface PixelArt {
    name: string;
    width: number;
    height: number;
    grid: number[][];
}
/**
 * Convert a text string to pixel art using the built-in 5×7 font.
 * Unsupported characters are replaced with a blank space.
 */
export declare function textToPixelArt(text: string): PixelArt | null;
export declare const PIXEL_ARTS: Record<string, PixelArt>;
/**
 * Convert a PixelArt placed at a position on the QR grid into ArtPixel array.
 */
export declare function artToPixels(art: PixelArt, startRow: number, startCol: number): {
    row: number;
    col: number;
    value: 0 | 1;
}[];

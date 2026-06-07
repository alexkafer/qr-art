import { type QRGrid, type ErrorCorrectionLevel } from './types';
/**
 * Create an empty QR grid with all function patterns placed.
 */
export declare function createGrid(version: number): QRGrid;
/**
 * Get the data module positions in placement order (serpentine pattern).
 * Returns array of [row, col] pairs in the order data bits should be placed.
 */
export declare function getDataModuleOrder(grid: QRGrid): [number, number][];
/**
 * Place data bits into the grid following serpentine order.
 */
export declare function placeDataBits(grid: QRGrid, bits: number[]): void;
/**
 * Apply a mask pattern to data modules (XOR).
 */
export declare function applyMask(grid: QRGrid, maskPattern: number): void;
/**
 * Get the mask function value at a position.
 */
export declare function getMaskBit(maskPattern: number, row: number, col: number): number;
/**
 * Place format information into the grid.
 */
export declare function placeFormatInfo(grid: QRGrid, ecLevel: ErrorCorrectionLevel, maskPattern: number): void;

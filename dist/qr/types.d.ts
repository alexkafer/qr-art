export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type Module = 0 | 1;
export type ModuleType = 'finder' | 'separator' | 'timing' | 'alignment' | 'format' | 'version' | 'dark' | 'data';
export interface QRGrid {
    size: number;
    modules: Module[][];
    types: ModuleType[][];
}
export interface QRVersion {
    version: number;
    size: number;
    alignmentPatternPositions: number[];
    totalDataCodewords: Record<ErrorCorrectionLevel, number>;
    ecCodewordsPerBlock: Record<ErrorCorrectionLevel, number>;
    numBlocks: Record<ErrorCorrectionLevel, {
        group1: [number, number];
        group2?: [number, number];
    }>;
}
export declare const EC_LEVEL_BITS: Record<ErrorCorrectionLevel, number>;
export declare const QR_VERSIONS: QRVersion[];
export declare function getVersion(v: number): QRVersion;

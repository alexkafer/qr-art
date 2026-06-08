import type { ErrorCorrectionLevel } from '../qr/types';
export interface QRArtGeneratorProps {
    /** Default URL prefix for generated QR codes */
    defaultUrl?: string;
    /** Default QR version (2-6) */
    defaultVersion?: number;
    /** Default error correction level */
    defaultEcLevel?: ErrorCorrectionLevel;
    /** Whether to show the module map debug view */
    showModuleMap?: boolean;
    /** Custom CSS class name for the root container */
    className?: string;
    /** Color theme: 'light', 'dark', or 'auto' (respects prefers-color-scheme) */
    theme?: 'light' | 'dark' | 'auto';
}
export declare function QRArtGenerator({ defaultUrl, defaultVersion, defaultEcLevel, showModuleMap, className, theme, }: QRArtGeneratorProps): import("react").JSX.Element;

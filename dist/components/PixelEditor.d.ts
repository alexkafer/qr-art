interface PixelEditorProps {
    grid: number[][];
    width: number;
    height: number;
    onChange: (grid: number[][]) => void;
    onResize: (width: number, height: number) => void;
    constrainedCells?: Set<string>;
}
export declare function PixelEditor({ grid, width, height, onChange, onResize, constrainedCells }: PixelEditorProps): import("react").JSX.Element;
/** Create an empty grid of given dimensions */
export declare function createEmptyGrid(width: number, height: number): number[][];
/** Resize a grid, preserving existing content where possible */
export declare function resizeGrid(grid: number[][], newWidth: number, newHeight: number): number[][];
export {};

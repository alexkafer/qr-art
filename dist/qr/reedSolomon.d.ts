/**
 * Get (cached) RS generator polynomial for given EC codeword count.
 * g(x) = (x - α^0)(x - α^1)...(x - α^(n-1))
 */
export declare function getGeneratorPoly(numECCodewords: number): number[];
/**
 * Compute Reed-Solomon error correction codewords for the given data.
 */
export declare function computeEC(data: number[], numECCodewords: number): number[];

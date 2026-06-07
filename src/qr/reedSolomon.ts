// Reed-Solomon error correction encoding for QR codes

import { gfExp, gfMul, polyDivRemainder } from './galoisField';

// Cache generator polynomials
const generatorCache = new Map<number, number[]>();

/**
 * Get (cached) RS generator polynomial for given EC codeword count.
 * g(x) = (x - α^0)(x - α^1)...(x - α^(n-1))
 */
export function getGeneratorPoly(numECCodewords: number): number[] {
  if (generatorCache.has(numECCodewords)) {
    return generatorCache.get(numECCodewords)!;
  }

  let gen = [1];
  for (let i = 0; i < numECCodewords; i++) {
    const factor = [1, gfExp(i)];
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      for (let k = 0; k < factor.length; k++) {
        newGen[j + k] ^= gfMul(gen[j], factor[k]);
      }
    }
    gen = newGen;
  }

  generatorCache.set(numECCodewords, gen);
  return gen;
}

/**
 * Compute Reed-Solomon error correction codewords for the given data.
 */
export function computeEC(data: number[], numECCodewords: number): number[] {
  const gen = getGeneratorPoly(numECCodewords);
  const paddedData = [...data, ...new Array(numECCodewords).fill(0)];
  return polyDivRemainder(paddedData, gen);
}

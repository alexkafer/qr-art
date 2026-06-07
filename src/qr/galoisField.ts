// Galois Field GF(256) arithmetic for QR code Reed-Solomon encoding
// Using primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D)

const GF_SIZE = 256;
const PRIMITIVE_POLY = 0x11D;

// Precompute log and exp tables
const EXP_TABLE = new Uint8Array(512); // exp[i] = α^i, doubled for convenience
const LOG_TABLE = new Uint8Array(256); // log[i] = discrete log base α of i

function initTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x >= GF_SIZE) {
      x ^= PRIMITIVE_POLY;
    }
  }
  // Extend exp table for easier multiplication
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255];
  }
}

initTables();

export function gfExp(a: number): number {
  return EXP_TABLE[((a % 255) + 255) % 255];
}

export function gfLog(a: number): number {
  if (a === 0) throw new Error('Log of zero is undefined in GF(256)');
  return LOG_TABLE[a];
}

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

export function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] - LOG_TABLE[b] + 255) % 255];
}

export function gfPow(a: number, power: number): number {
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] * power) % 255];
}

// Polynomial multiplication in GF(256)
// Polynomials are arrays where index = power of x
export function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

// Polynomial division remainder in GF(256)
// Returns remainder of dividend / divisor
export function polyDivRemainder(dividend: number[], divisor: number[]): number[] {
  const result = [...dividend];
  for (let i = 0; i < dividend.length - divisor.length + 1; i++) {
    if (result[i] === 0) continue;
    const coeff = result[i];
    for (let j = 1; j < divisor.length; j++) {
      result[i + j] ^= gfMul(divisor[j], coeff);
    }
  }
  // Return only the remainder part
  return result.slice(dividend.length - divisor.length + 1);
}

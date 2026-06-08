import { useCallback as e, useMemo as t, useRef as n, useState as r } from "react";
import { Fragment as i, jsx as a, jsxs as o } from "react/jsx-runtime";
//#region src/qr/types.ts
var s = {
	L: 1,
	M: 0,
	Q: 3,
	H: 2
}, c = [
	{
		version: 1,
		size: 21,
		alignmentPatternPositions: [],
		totalDataCodewords: {
			L: 19,
			M: 16,
			Q: 13,
			H: 9
		},
		ecCodewordsPerBlock: {
			L: 7,
			M: 10,
			Q: 13,
			H: 17
		},
		numBlocks: {
			L: { group1: [1, 19] },
			M: { group1: [1, 16] },
			Q: { group1: [1, 13] },
			H: { group1: [1, 9] }
		}
	},
	{
		version: 2,
		size: 25,
		alignmentPatternPositions: [6, 18],
		totalDataCodewords: {
			L: 34,
			M: 28,
			Q: 22,
			H: 16
		},
		ecCodewordsPerBlock: {
			L: 10,
			M: 16,
			Q: 22,
			H: 28
		},
		numBlocks: {
			L: { group1: [1, 34] },
			M: { group1: [1, 28] },
			Q: { group1: [1, 22] },
			H: { group1: [1, 16] }
		}
	},
	{
		version: 3,
		size: 29,
		alignmentPatternPositions: [6, 22],
		totalDataCodewords: {
			L: 55,
			M: 44,
			Q: 34,
			H: 26
		},
		ecCodewordsPerBlock: {
			L: 15,
			M: 26,
			Q: 18,
			H: 22
		},
		numBlocks: {
			L: { group1: [1, 55] },
			M: { group1: [1, 44] },
			Q: { group1: [2, 17] },
			H: { group1: [2, 13] }
		}
	},
	{
		version: 4,
		size: 33,
		alignmentPatternPositions: [6, 26],
		totalDataCodewords: {
			L: 80,
			M: 64,
			Q: 48,
			H: 36
		},
		ecCodewordsPerBlock: {
			L: 20,
			M: 18,
			Q: 26,
			H: 16
		},
		numBlocks: {
			L: { group1: [1, 80] },
			M: { group1: [2, 32] },
			Q: { group1: [2, 24] },
			H: { group1: [4, 9] }
		}
	},
	{
		version: 5,
		size: 37,
		alignmentPatternPositions: [6, 30],
		totalDataCodewords: {
			L: 108,
			M: 86,
			Q: 62,
			H: 46
		},
		ecCodewordsPerBlock: {
			L: 26,
			M: 24,
			Q: 18,
			H: 22
		},
		numBlocks: {
			L: { group1: [1, 108] },
			M: { group1: [2, 43] },
			Q: {
				group1: [2, 15],
				group2: [2, 16]
			},
			H: {
				group1: [2, 11],
				group2: [2, 12]
			}
		}
	},
	{
		version: 6,
		size: 41,
		alignmentPatternPositions: [6, 34],
		totalDataCodewords: {
			L: 136,
			M: 108,
			Q: 76,
			H: 60
		},
		ecCodewordsPerBlock: {
			L: 18,
			M: 16,
			Q: 24,
			H: 28
		},
		numBlocks: {
			L: { group1: [2, 68] },
			M: { group1: [4, 27] },
			Q: { group1: [4, 19] },
			H: { group1: [4, 15] }
		}
	}
];
function l(e) {
	let t = c[e - 1];
	if (!t) throw Error(`QR version ${e} not supported`);
	return t;
}
//#endregion
//#region src/qr/galoisField.ts
var u = 256, d = 285, f = new Uint8Array(512), p = new Uint8Array(256);
function m() {
	let e = 1;
	for (let t = 0; t < 255; t++) f[t] = e, p[e] = t, e <<= 1, e >= u && (e ^= d);
	for (let e = 255; e < 512; e++) f[e] = f[e - 255];
}
m();
function h(e) {
	return f[(e % 255 + 255) % 255];
}
function g(e, t) {
	return e === 0 || t === 0 ? 0 : f[p[e] + p[t]];
}
function _(e, t) {
	let n = [...e];
	for (let r = 0; r < e.length - t.length + 1; r++) {
		if (n[r] === 0) continue;
		let e = n[r];
		for (let i = 1; i < t.length; i++) n[r + i] ^= g(t[i], e);
	}
	return n.slice(e.length - t.length + 1);
}
//#endregion
//#region src/qr/reedSolomon.ts
var v = /* @__PURE__ */ new Map();
function y(e) {
	if (v.has(e)) return v.get(e);
	let t = [1];
	for (let n = 0; n < e; n++) {
		let e = [1, h(n)], r = Array(t.length + 1).fill(0);
		for (let n = 0; n < t.length; n++) for (let i = 0; i < e.length; i++) r[n + i] ^= g(t[n], e[i]);
		t = r;
	}
	return v.set(e, t), t;
}
function b(e, t) {
	let n = y(t);
	return _([...e, ...Array(t).fill(0)], n);
}
//#endregion
//#region src/qr/encoding.ts
function x(e, t, n) {
	let r = l(t).totalDataCodewords[n], i = [];
	S(i, 4, 4), S(i, e.length, 8);
	for (let t = 0; t < e.length; t++) S(i, e.charCodeAt(t), 8);
	let a = r * 8;
	for (S(i, 0, Math.min(4, a - i.length)); i.length % 8 != 0;) i.push(0);
	let o = [];
	for (let e = 0; e < i.length; e += 8) {
		let t = 0;
		for (let n = 0; n < 8; n++) t = t << 1 | (i[e + n] || 0);
		o.push(t);
	}
	let s = [236, 17], c = 0;
	for (; o.length < r;) o.push(s[c % 2]), c++;
	return o;
}
function S(e, t, n) {
	for (let r = n - 1; r >= 0; r--) e.push(t >> r & 1);
}
//#endregion
//#region src/qr/placement.ts
function C(e) {
	let t = l(e), n = t.size, r = Array.from({ length: n }, () => Array(n).fill(0)), i = Array.from({ length: n }, () => Array(n).fill("data"));
	w(r, i, 0, 0), w(r, i, 0, n - 7), w(r, i, n - 7, 0), T(r, i, n), D(r, i, n), t.alignmentPatternPositions.length > 0 && O(r, i, t.alignmentPatternPositions, n);
	let a = 4 * e + 9;
	return r[a][8] = 1, i[a][8] = "dark", k(i, n), {
		size: n,
		modules: r,
		types: i
	};
}
function w(e, t, n, r) {
	let i = [
		[
			1,
			1,
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			1,
			1,
			1,
			0,
			1
		],
		[
			1,
			0,
			1,
			1,
			1,
			0,
			1
		],
		[
			1,
			0,
			1,
			1,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			1,
			1,
			1
		]
	];
	for (let a = 0; a < 7; a++) for (let o = 0; o < 7; o++) e[n + a][r + o] = i[a][o], t[n + a][r + o] = "finder";
}
function T(e, t, n) {
	for (let r = 0; r < 8; r++) E(e, t, 7, r, n), E(e, t, r, 7, n), E(e, t, 7, n - 8 + r, n), E(e, t, r, n - 8, n), E(e, t, n - 8, r, n), E(e, t, n - 8 + r, 7, n);
}
function E(e, t, n, r, i) {
	n >= 0 && n < i && r >= 0 && r < i && t[n][r] !== "finder" && (e[n][r] = 0, t[n][r] = "separator");
}
function D(e, t, n) {
	for (let r = 8; r < n - 8; r++) t[6][r] === "data" && (e[6][r] = +(r % 2 == 0), t[6][r] = "timing"), t[r][6] === "data" && (e[r][6] = +(r % 2 == 0), t[r][6] = "timing");
}
function O(e, t, n, r) {
	let i = [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			1
		]
	];
	for (let a of n) for (let o of n) {
		let n = a, s = o;
		if (!(n <= 8 && s <= 8 || n <= 8 && s >= r - 8 || n >= r - 8 && s <= 8)) for (let r = -2; r <= 2; r++) for (let a = -2; a <= 2; a++) e[n + r][s + a] = i[r + 2][a + 2], t[n + r][s + a] = "alignment";
	}
}
function k(e, t) {
	for (let t = 0; t <= 8; t++) e[8][t] === "data" && (e[8][t] = "format"), e[t][8] === "data" && (e[t][8] = "format");
	for (let n = 0; n <= 7; n++) e[8][t - 1 - n] === "data" && (e[8][t - 1 - n] = "format");
	for (let n = 0; n <= 7; n++) e[t - 1 - n][8] === "data" && (e[t - 1 - n][8] = "format");
}
function A(e) {
	let { size: t, types: n } = e, r = [], i = t - 1, a = !0;
	for (; i >= 0;) {
		if (i === 6) {
			i--;
			continue;
		}
		if (i - 1 < 0 || i - 1, a) for (let e = t - 1; e >= 0; e--) {
			n[e][i] === "data" && r.push([e, i]);
			let t = i - 1;
			t >= 0 && t !== 6 && n[e][t] === "data" && r.push([e, t]);
		}
		else for (let e = 0; e < t; e++) {
			n[e][i] === "data" && r.push([e, i]);
			let t = i - 1;
			t >= 0 && t !== 6 && n[e][t] === "data" && r.push([e, t]);
		}
		a = !a, i -= 2, i === 6 && i--;
	}
	return r;
}
function j(e, t) {
	let n = A(e);
	for (let r = 0; r < n.length && r < t.length; r++) {
		let [i, a] = n[r];
		e.modules[i][a] = t[r];
	}
}
var M = [
	(e, t) => (e + t) % 2 == 0,
	(e, t) => e % 2 == 0,
	(e, t) => t % 3 == 0,
	(e, t) => (e + t) % 3 == 0,
	(e, t) => (Math.floor(e / 2) + Math.floor(t / 3)) % 2 == 0,
	(e, t) => e * t % 2 + e * t % 3 == 0,
	(e, t) => (e * t % 2 + e * t % 3) % 2 == 0,
	(e, t) => ((e + t) % 2 + e * t % 3) % 2 == 0
];
function N(e, t) {
	let n = M[t];
	for (let t = 0; t < e.size; t++) for (let r = 0; r < e.size; r++) e.types[t][r] === "data" && n(t, r) && (e.modules[t][r] = e.modules[t][r] ^ 1);
}
function P(e, t, n) {
	return +!!M[e](t, n);
}
function F(e, t) {
	let n = s[e] << 3 | t, r = n << 10;
	for (let e = 14; e >= 10; e--) r & 1 << e && (r ^= 1335 << e - 10);
	return (n << 10 | r) ^ 21522;
}
function I(e, t, n) {
	let r = F(t, n), { size: i, modules: a } = e, o = [
		[8, 0],
		[8, 1],
		[8, 2],
		[8, 3],
		[8, 4],
		[8, 5],
		[8, 7],
		[8, 8]
	], s = [
		[7, 8],
		[5, 8],
		[4, 8],
		[3, 8],
		[2, 8],
		[1, 8],
		[0, 8]
	];
	for (let e = 0; e <= 7; e++) {
		let t = r >> 14 - e & 1, [n, i] = o[e];
		a[n][i] = t;
	}
	for (let e = 0; e <= 6; e++) {
		let t = r >> 6 - e & 1, [n, i] = s[e];
		a[n][i] = t;
	}
	for (let e = 0; e <= 7; e++) {
		let t = r >> e & 1;
		a[8][i - 1 - e] = t;
	}
	for (let e = 0; e <= 6; e++) {
		let t = r >> 8 + e & 1;
		a[i - 1 - e][8] = t;
	}
}
//#endregion
//#region src/qr/pixelArt.ts
var L = {
	A: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	B: [
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			0
		]
	],
	C: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	D: [
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			0
		]
	],
	E: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		]
	],
	F: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		]
	],
	G: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	H: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	I: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		]
	],
	J: [
		[
			0,
			0,
			1,
			1,
			1
		],
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			0,
			1,
			1,
			0,
			0
		]
	],
	K: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			1,
			0,
			1,
			0,
			0
		],
		[
			1,
			1,
			0,
			0,
			0
		],
		[
			1,
			0,
			1,
			0,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	L: [
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		]
	],
	M: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			0,
			1,
			1
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	N: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			0,
			0,
			1
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	O: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	P: [
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		]
	],
	Q: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			0,
			1,
			1,
			0,
			1
		]
	],
	R: [
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			1,
			0,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	S: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	T: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		]
	],
	U: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	V: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		]
	],
	W: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			1,
			0,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	X: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		]
	],
	Y: [
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		]
	],
	Z: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			1,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		]
	],
	0: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			1,
			1
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			1,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	1: [
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			1,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	2: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			1,
			1,
			0
		],
		[
			0,
			1,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		]
	],
	3: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			1,
			1,
			0
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	4: [
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			1,
			0
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			0,
			0,
			0,
			1,
			0
		]
	],
	5: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	6: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			0,
			0,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	7: [
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		]
	],
	8: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	9: [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		]
	],
	" ": [
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		]
	],
	"!": [
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		]
	],
	"?": [
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			1,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		]
	],
	"&": [
		[
			0,
			1,
			1,
			0,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			0,
			1,
			1,
			0,
			0
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			1,
			0
		],
		[
			0,
			1,
			1,
			0,
			1
		]
	],
	"+": [
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		]
	]
}, R = [
	[
		0,
		1,
		0,
		1,
		0
	],
	[
		1,
		1,
		1,
		1,
		1
	],
	[
		1,
		1,
		1,
		1,
		1
	],
	[
		1,
		1,
		1,
		1,
		1
	],
	[
		0,
		1,
		1,
		1,
		0
	],
	[
		0,
		0,
		1,
		0,
		0
	],
	[
		0,
		0,
		0,
		0,
		0
	]
], z = {
	"♥": R,
	"♡": [
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		]
	],
	"★": [
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			0,
			0,
			1,
			0,
			0
		],
		[
			1,
			1,
			1,
			1,
			1
		],
		[
			0,
			1,
			1,
			1,
			0
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			1,
			0,
			0,
			0,
			1
		],
		[
			0,
			0,
			0,
			0,
			0
		]
	],
	"∞": [
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			1,
			0,
			1,
			0,
			1
		],
		[
			0,
			1,
			0,
			1,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0
		]
	]
};
function B(e) {
	let t = e.toUpperCase();
	return L[t] ? L[t] : z[e] ? z[e] : null;
}
function V(e) {
	let t = e.length * 5 + (e.length - 1) * 1, n = [];
	for (let t = 0; t < 7; t++) {
		let r = [];
		for (let n = 0; n < e.length; n++) {
			for (let i = 0; i < 5; i++) r.push(e[n][t][i]);
			n < e.length - 1 && r.push(0);
		}
		n.push(r);
	}
	return {
		name: "composed",
		width: t,
		height: 7,
		grid: n
	};
}
function H(e) {
	if (!e || e.length === 0) return null;
	let t = [];
	for (let n of e) {
		let e = B(n);
		t.push(e ?? L[" "]);
	}
	return t.length === 0 ? null : V(t);
}
var U = {
	"R♥A": V([
		L.R,
		R,
		L.A
	]),
	LOVE: V([
		L.L,
		L.O,
		L.V,
		L.E
	]),
	"I DO": V([
		L.I,
		L[" "],
		L.D,
		L.O
	]),
	"YES!": V([
		L.Y,
		L.E,
		L.S,
		L["!"]
	]),
	Rings: {
		name: "Rings",
		width: 11,
		height: 7,
		grid: [
			[
				0,
				1,
				1,
				1,
				0,
				0,
				0,
				1,
				1,
				1,
				0
			],
			[
				1,
				0,
				0,
				0,
				1,
				0,
				1,
				0,
				0,
				0,
				1
			],
			[
				1,
				0,
				0,
				0,
				1,
				0,
				1,
				0,
				0,
				0,
				1
			],
			[
				1,
				0,
				0,
				1,
				0,
				1,
				0,
				1,
				0,
				0,
				1
			],
			[
				1,
				0,
				0,
				0,
				1,
				0,
				1,
				0,
				0,
				0,
				1
			],
			[
				1,
				0,
				0,
				0,
				1,
				0,
				1,
				0,
				0,
				0,
				1
			],
			[
				0,
				1,
				1,
				1,
				0,
				0,
				0,
				1,
				1,
				1,
				0
			]
		]
	},
	"◇": {
		name: "Diamond",
		width: 7,
		height: 7,
		grid: [
			[
				0,
				0,
				0,
				1,
				0,
				0,
				0
			],
			[
				0,
				0,
				1,
				0,
				1,
				0,
				0
			],
			[
				0,
				1,
				0,
				0,
				0,
				1,
				0
			],
			[
				1,
				0,
				0,
				0,
				0,
				0,
				1
			],
			[
				0,
				1,
				0,
				0,
				0,
				1,
				0
			],
			[
				0,
				0,
				1,
				0,
				1,
				0,
				0
			],
			[
				0,
				0,
				0,
				1,
				0,
				0,
				0
			]
		]
	},
	"🏠": {
		name: "House",
		width: 9,
		height: 7,
		grid: [
			[
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				1,
				0,
				1,
				0,
				0,
				0
			],
			[
				0,
				0,
				1,
				0,
				0,
				0,
				1,
				0,
				0
			],
			[
				0,
				1,
				0,
				0,
				0,
				0,
				0,
				1,
				0
			],
			[
				0,
				1,
				0,
				1,
				0,
				1,
				0,
				1,
				0
			],
			[
				0,
				1,
				0,
				1,
				0,
				1,
				0,
				1,
				0
			],
			[
				0,
				1,
				1,
				1,
				1,
				1,
				1,
				1,
				0
			]
		]
	},
	"🥂": {
		name: "Cheers",
		width: 11,
		height: 7,
		grid: [
			[
				0,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				1,
				0
			],
			[
				0,
				1,
				1,
				0,
				0,
				0,
				0,
				0,
				1,
				1,
				0
			],
			[
				0,
				0,
				1,
				1,
				0,
				0,
				0,
				1,
				1,
				0,
				0
			],
			[
				0,
				0,
				0,
				1,
				1,
				0,
				1,
				1,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0,
				1,
				1,
				1,
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				0
			],
			[
				0,
				0,
				0,
				0,
				1,
				1,
				1,
				0,
				0,
				0,
				0
			]
		]
	}
};
function W(e, t, n) {
	let r = [];
	for (let i = 0; i < e.height; i++) for (let a = 0; a < e.width; a++) r.push({
		row: t + i,
		col: n + a,
		value: e.grid[i][a]
	});
	return r;
}
//#endregion
//#region src/qr/engine.ts
function G(e) {
	let { data: t, version: n, ecLevel: r, maskPattern: i } = e, a = l(n), o = x(t, n, r), s = a.ecCodewordsPerBlock[r], c = a.numBlocks[r], { interleavedData: u, interleavedEC: d } = ne(o, s, c), f = re([...u, ...d]), p = C(n);
	j(p, f);
	let m = i ?? ie(p, r);
	return N(p, m), I(p, r, m), p;
}
function K(e) {
	let { urlPrefix: t, version: n, ecLevel: r, artPixels: i, maskPattern: a } = e, o = l(n), s = o.totalDataCodewords[r], c = o.ecCodewordsPerBlock[r], u = o.numBlocks[r], d = a === void 0 ? [
		0,
		1,
		2,
		3,
		4,
		5,
		6,
		7
	] : [a], f = null;
	for (let e of d) {
		let a = ee(t, n, r, i, e, s, c, u), o = a.grid.modules.reduce((e, t) => e + t.reduce((e, t) => e + t, 0), 0), l = a.suffixBytes.filter((e) => e > 127).length;
		(!f || l < f.suffixBytes.filter((e) => e > 127).length || l === f.suffixBytes.filter((e) => e > 127).length && (o < f.grid.modules.reduce((e, t) => e + t.reduce((e, t) => e + t, 0), 0) || o === f.grid.modules.reduce((e, t) => e + t.reduce((e, t) => e + t, 0), 0) && a.overlayFlips < f.overlayFlips)) && (f = {
			...a,
			maskPattern: e,
			blackPixelCount: o
		});
	}
	return f;
}
function q(e, t, n, r, i, a) {
	let o = l(t), s = o.size, c = o.totalDataCodewords[n], u = C(t), d = A(u), f = c * 8, p = 12 + e.length * 8, m = /* @__PURE__ */ new Map();
	d.forEach(([e, t], n) => {
		m.set(`${e},${t}`, n);
	});
	let h = /* @__PURE__ */ new Set();
	for (let e = 0; e < s; e++) for (let t = 0; t < s; t++) u.types[e][t] !== "data" && h.add(`${e},${t}`);
	let g = null, _ = -Infinity;
	for (let e = 0; e <= s - i; e++) for (let t = 0; t <= s - r; t++) {
		let n = 0, o = 0, c = 0;
		for (let s = 0; s < i; s++) for (let i = 0; i < r; i++) {
			let r = `${e + s},${t + i}`;
			if (h.has(r)) {
				o++;
				continue;
			}
			if (a?.has(r)) {
				c++;
				continue;
			}
			let l = m.get(r);
			l !== void 0 && l >= p && l < f && n++;
		}
		if (o > 0 || c > 0) continue;
		let l = Math.abs(e + i / 2 - s / 2) + Math.abs(t + r / 2 - s / 2), u = n * 1e3 - l;
		u > _ && (_ = u, g = {
			row: e,
			col: t
		});
	}
	return g;
}
function J(e, t, n) {
	let r = t & e;
	for (let t = 0; t < 8; t++) {
		if (e & 1 << t) continue;
		let i = n.get(t);
		i !== void 0 && i === 1 && (r |= 1 << t);
	}
	return r;
}
function ee(e, t, n, r, i, a, o, s) {
	let c = A(C(t)), u = /* @__PURE__ */ new Map();
	c.forEach(([e, t], n) => {
		u.set(`${e},${t}`, n);
	});
	let { dataBlockMap: d } = te(Array(a).fill(0), o, s), f = a * 8, p = Math.floor((f - 12) / 8), m = 12 + e.length * 8, h = [];
	for (let e of r) {
		let t = `${e.row},${e.col}`, n = u.get(t);
		if (n === void 0 || n >= f) continue;
		let r = P(i, e.row, e.col), a = e.value ^ r, o = Math.floor(n / 8), c = 7 - n % 8;
		if (o >= d.length) continue;
		let { blockIndex: l, posInBlock: p } = d[o], m = s.group1[0], g = s.group1[1], _;
		_ = l < m ? l * g + p : m * g + (l - m) * (s.group2?.[1] ?? 0) + p;
		let v = _ * 8 + (7 - c);
		h.push({
			seqBitIndex: v,
			rawValue: a
		});
	}
	let g = m - 1;
	for (let { seqBitIndex: e } of h) e >= m && e > g && (g = e);
	let _ = Math.floor((g - 12) / 8), v = Math.min(_ + 1, p), y = Math.max(0, v - e.length), b = /* @__PURE__ */ new Map();
	for (let [e, t] of u) {
		if (t >= f) continue;
		let n = Math.floor(t / 8), r = 7 - t % 8;
		if (n >= d.length) continue;
		let { blockIndex: i, posInBlock: a } = d[n], o = s.group1[0], c = s.group1[1], l;
		l = i < o ? i * c + a : o * c + (i - o) * (s.group2?.[1] ?? 0) + a;
		let u = l * 8 + (7 - r), [p, m] = e.split(",").map(Number);
		b.set(u, [p, m]);
	}
	let x = Array.from({ length: y }, () => ({
		mask: 0,
		value: 0
	}));
	for (let { seqBitIndex: t, rawValue: n } of h) {
		let r = Math.floor((t - 12) / 8), i = 7 - (t - 12) % 8;
		if (r < e.length || r >= v) continue;
		let a = r - e.length;
		a >= 0 && a < y && (x[a].mask |= 1 << i, n && (x[a].value |= 1 << i));
	}
	let S = new Uint8Array(y);
	for (let t = 0; t < y; t++) {
		let { mask: n, value: r } = x[t], a = /* @__PURE__ */ new Map(), o = e.length + t;
		for (let e = 0; e < 8; e++) {
			if (n & 1 << e) continue;
			let t = 12 + o * 8 + (7 - e), r = b.get(t);
			r && a.set(e, P(i, r[0], r[1]));
		}
		S[t] = J(n, r, a);
	}
	let w = e + Array.from(S).map((e) => String.fromCharCode(e)).join(""), T = G({
		data: w,
		version: t,
		ecLevel: n,
		maskPattern: i
	}), E = 0;
	for (let e of r) e.row < T.size && e.col < T.size && T.modules[e.row][e.col] === e.value && E++;
	let D = l(t).ecCodewordsPerBlock[n], O = s.group1[0] + (s.group2?.[0] ?? 0), k = Math.floor(D / 2), j = /* @__PURE__ */ new Map();
	c.forEach(([e, t], n) => {
		j.set(`${e},${t}`, Math.floor(n / 8));
	});
	let M = {
		size: T.size,
		modules: T.modules.map((e) => [...e]),
		types: T.types.map((e) => [...e])
	}, N = /* @__PURE__ */ new Map();
	for (let e = 0; e < O; e++) N.set(e, /* @__PURE__ */ new Set());
	let F = 0, I = 0, L = /* @__PURE__ */ new Set();
	for (let e of r) {
		if (e.row >= T.size || e.col >= T.size || M.modules[e.row][e.col] === e.value) continue;
		let t = `${e.row},${e.col}`, n = j.get(t);
		if (n === void 0) continue;
		let r;
		if (n < d.length) r = d[n].blockIndex;
		else {
			let e = n - d.length;
			r = e < O * D ? e % O : 0;
		}
		let i = N.get(r);
		if (!i.has(n) && i.size >= k) {
			I++, L.add(t);
			continue;
		}
		M.modules[e.row][e.col] = e.value, i.add(n), F++;
	}
	let R = k * O, z = F > 0 ? M : T, B = 0;
	for (let e of r) e.row < z.size && e.col < z.size && z.modules[e.row][e.col] === e.value && B++;
	return {
		grid: z,
		decodedUrl: w,
		suffixBytes: Array.from(S),
		artMatch: B,
		overlayFlips: F,
		maxFlips: R,
		skippedFlips: I,
		constrainedPixels: L
	};
}
function te(e, t, n) {
	let r = [], i = 0, [a, o] = n.group1;
	for (let n = 0; n < a; n++) {
		let n = e.slice(i, i + o);
		i += o;
		let a = b(n, t);
		r.push({
			data: n,
			ec: a
		});
	}
	if (n.group2) {
		let [a, o] = n.group2;
		for (let n = 0; n < a; n++) {
			let n = e.slice(i, i + o);
			i += o;
			let a = b(n, t);
			r.push({
				data: n,
				ec: a
			});
		}
	}
	let s = Math.max(...r.map((e) => e.data.length)), c = [], l = [];
	for (let e = 0; e < s; e++) for (let t = 0; t < r.length; t++) e < r[t].data.length && (c.push(r[t].data[e]), l.push({
		blockIndex: t,
		posInBlock: e
	}));
	let u = [], d = [];
	for (let e = 0; e < t; e++) for (let t = 0; t < r.length; t++) e < r[t].ec.length && (u.push(r[t].ec[e]), d.push({
		blockIndex: t,
		posInBlock: e
	}));
	return {
		interleavedData: c,
		interleavedEC: u,
		dataBlockMap: l,
		ecBlockMap: d
	};
}
function ne(e, t, n) {
	let r = [], i = 0, [a, o] = n.group1;
	for (let n = 0; n < a; n++) {
		let n = e.slice(i, i + o);
		i += o;
		let a = b(n, t);
		r.push({
			data: n,
			ec: a
		});
	}
	if (n.group2) {
		let [a, o] = n.group2;
		for (let n = 0; n < a; n++) {
			let n = e.slice(i, i + o);
			i += o;
			let a = b(n, t);
			r.push({
				data: n,
				ec: a
			});
		}
	}
	let s = Math.max(...r.map((e) => e.data.length)), c = [];
	for (let e = 0; e < s; e++) for (let t of r) e < t.data.length && c.push(t.data[e]);
	let l = [];
	for (let e = 0; e < t; e++) for (let t of r) e < t.ec.length && l.push(t.ec[e]);
	return {
		interleavedData: c,
		interleavedEC: l
	};
}
function re(e) {
	let t = [];
	for (let n of e) for (let e = 7; e >= 0; e--) t.push(n >> e & 1);
	return t;
}
function ie(e, t) {
	let n = 0, r = Infinity;
	for (let i = 0; i < 8; i++) {
		let a = ae(e);
		N(a, i), I(a, t, i);
		let o = oe(a);
		o < r && (r = o, n = i);
	}
	return n;
}
function ae(e) {
	return {
		size: e.size,
		modules: e.modules.map((e) => [...e]),
		types: e.types.map((e) => [...e])
	};
}
function oe(e) {
	let t = 0, { size: n, modules: r } = e;
	for (let e = 0; e < n; e++) {
		let i = 1;
		for (let a = 1; a < n; a++) r[e][a] === r[e][a - 1] ? i++ : (i >= 5 && (t += i - 2), i = 1);
		i >= 5 && (t += i - 2);
	}
	for (let e = 0; e < n; e++) {
		let i = 1;
		for (let a = 1; a < n; a++) r[a][e] === r[a - 1][e] ? i++ : (i >= 5 && (t += i - 2), i = 1);
		i >= 5 && (t += i - 2);
	}
	return t;
}
function Y(e, t = 10, n = 4) {
	let r = (e.size + n * 2) * t, i = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r} ${r}" width="${r}" height="${r}">`;
	i += `<rect width="${r}" height="${r}" fill="white"/>`;
	for (let r = 0; r < e.size; r++) for (let a = 0; a < e.size; a++) if (e.modules[r][a] === 1) {
		let e = (a + n) * t, o = (r + n) * t;
		i += `<rect x="${e}" y="${o}" width="${t}" height="${t}" fill="black"/>`;
	}
	return i += "</svg>", i;
}
//#endregion
//#region src/components/PixelEditor.tsx
var X = 20, Z = 1;
function Q({ grid: t, width: i, height: s, onChange: c, onResize: l, constrainedCells: u }) {
	let d = n(null), [f, p] = r(!1), m = n(null), h = n(null), g = e((e, n, r) => {
		let i = t.map((e) => [...e]), a = r ?? (i[e][n] === 1 ? 0 : 1);
		return i[e][n] = a, c(i), a;
	}, [t, c]), _ = e((e, t) => {
		d.current = g(e, t), p(!0);
	}, [g]), v = e((e, t) => {
		f && d.current !== null && g(e, t, d.current);
	}, [f, g]), y = e(() => {
		d.current = null, p(!1);
	}, []), b = e((e) => {
		let t = m.current;
		if (!t) return null;
		let n = t.getBoundingClientRect(), r = e.clientX - n.left, a = e.clientY - n.top, o = Math.floor((r - Z) / 21), c = Math.floor((a - Z) / 21);
		return c < 0 || c >= s || o < 0 || o >= i ? null : {
			row: c,
			col: o
		};
	}, [i, s]), x = e((e) => {
		e.preventDefault();
		let t = b(e.touches[0]);
		t && (d.current = g(t.row, t.col), h.current = `${t.row},${t.col}`, p(!0));
	}, [b, g]), S = e((e) => {
		if (e.preventDefault(), d.current === null) return;
		let t = b(e.touches[0]);
		if (!t) return;
		let n = `${t.row},${t.col}`;
		n !== h.current && (h.current = n, g(t.row, t.col, d.current));
	}, [b, g]), C = e(() => {
		d.current = null, h.current = null, p(!1);
	}, []), w = e(() => {
		c(Array.from({ length: s }, () => Array(i).fill(0)));
	}, [
		i,
		s,
		c
	]), T = e(() => {
		c(Array.from({ length: s }, () => Array(i).fill(1)));
	}, [
		i,
		s,
		c
	]);
	return /* @__PURE__ */ o("div", {
		onMouseUp: y,
		onMouseLeave: y,
		children: [
			/* @__PURE__ */ o("div", {
				style: {
					display: "flex",
					gap: 8,
					marginBottom: 8,
					alignItems: "center",
					flexWrap: "wrap"
				},
				children: [
					/* @__PURE__ */ o("label", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 4,
							fontSize: 13
						},
						children: ["W:", /* @__PURE__ */ a("input", {
							type: "number",
							value: i,
							onChange: (e) => {
								let t = Number(e.target.value);
								t >= 1 && t <= 40 && l(t, s);
							},
							style: {
								width: 48,
								padding: 4,
								boxSizing: "border-box",
								background: "var(--qr-input-bg, #fff)",
								color: "var(--qr-fg, #1a1a1a)",
								border: "1px solid var(--qr-border, #ddd)",
								borderRadius: 4
							},
							min: 1,
							max: 40
						})]
					}),
					/* @__PURE__ */ o("label", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 4,
							fontSize: 13
						},
						children: ["H:", /* @__PURE__ */ a("input", {
							type: "number",
							value: s,
							onChange: (e) => {
								let t = Number(e.target.value);
								t >= 1 && t <= 40 && l(i, t);
							},
							style: {
								width: 48,
								padding: 4,
								boxSizing: "border-box",
								background: "var(--qr-input-bg, #fff)",
								color: "var(--qr-fg, #1a1a1a)",
								border: "1px solid var(--qr-border, #ddd)",
								borderRadius: 4
							},
							min: 1,
							max: 40
						})]
					}),
					/* @__PURE__ */ a("button", {
						onClick: w,
						style: {
							padding: "4px 8px",
							fontSize: 12,
							cursor: "pointer",
							background: "var(--qr-input-bg, #fff)",
							color: "var(--qr-fg, #1a1a1a)",
							border: "1px solid var(--qr-border, #ddd)",
							borderRadius: 4
						},
						children: "Clear"
					}),
					/* @__PURE__ */ a("button", {
						onClick: T,
						style: {
							padding: "4px 8px",
							fontSize: 12,
							cursor: "pointer",
							background: "var(--qr-input-bg, #fff)",
							color: "var(--qr-fg, #1a1a1a)",
							border: "1px solid var(--qr-border, #ddd)",
							borderRadius: 4
						},
						children: "Fill"
					})
				]
			}),
			/* @__PURE__ */ a("div", {
				style: {
					overflowX: "auto",
					maxWidth: "100%"
				},
				children: /* @__PURE__ */ a("div", {
					ref: m,
					onTouchStart: x,
					onTouchMove: S,
					onTouchEnd: C,
					style: {
						display: "inline-grid",
						gridTemplateColumns: `repeat(${i}, ${X}px)`,
						gap: Z,
						background: "var(--qr-border, #ccc)",
						padding: Z,
						borderRadius: 4,
						cursor: "crosshair",
						userSelect: "none",
						touchAction: "none"
					},
					children: t.map((e, t) => e.map((e, n) => {
						let r = u?.has(`${t},${n}`) ?? !1, i;
						return i = e === 1 ? r ? "#cc4444" : "#000" : r ? "#ffcccc" : "#fff", /* @__PURE__ */ a("div", {
							onMouseDown: (e) => {
								e.preventDefault(), _(t, n);
							},
							onMouseEnter: () => v(t, n),
							style: {
								width: X,
								height: X,
								background: i,
								borderRadius: 2
							}
						}, `${t}-${n}`);
					}))
				})
			}),
			/* @__PURE__ */ o("div", {
				style: {
					fontSize: 11,
					color: "var(--qr-muted, #999)",
					marginTop: 4
				},
				children: [
					"Click/tap to toggle · drag to paint · ",
					i,
					"×",
					s,
					" = ",
					i * s,
					" modules"
				]
			})
		]
	});
}
function se(e, t) {
	return Array.from({ length: t }, () => Array(e).fill(0));
}
function $(e, t, n) {
	let r = [];
	for (let i = 0; i < n; i++) {
		let n = [];
		for (let r = 0; r < t; r++) n.push(i < e.length && r < (e[0]?.length ?? 0) ? e[i][r] : 0);
		r.push(n);
	}
	return r;
}
//#endregion
//#region src/components/QRArtGenerator.tsx
function ce({ defaultUrl: n = "https://alexkafer.com/labs/qr-art?code=", defaultVersion: s = 5, defaultEcLevel: c = "L", showModuleMap: l = !0, className: u, theme: d = "auto" }) {
	let [f, p] = r(n), [m, h] = r(s), [g, _] = r(c), [v, y] = r(void 0), [b, x] = r(!0), [S, C] = r(!0), w = U["R♥A"], [T, E] = r(w.grid.map((e) => [...e])), [D, O] = r(w.width), [k, A] = r(w.height), j = t(() => !b || D === 0 || k === 0 ? {
		row: 0,
		col: 0
	} : q(f, m, g, S ? D + 2 : D, S ? k + 2 : k) ?? {
		row: 0,
		col: 0
	}, [
		f,
		m,
		g,
		D,
		k,
		b,
		S
	]), M = t(() => {
		if (!b) return [];
		let e = {
			name: "custom",
			width: D,
			height: k,
			grid: T
		}, t = +!!S, n = +!!S, r = W(e, j.row + t, j.col + n);
		if (!S) return r;
		let i = new Set(r.map((e) => `${e.row},${e.col}`)), a = /* @__PURE__ */ new Set();
		for (let e of r) if (e.value === 1) for (let t = -1; t <= 1; t++) for (let n = -1; n <= 1; n++) {
			if (t === 0 && n === 0) continue;
			let o = e.row + t, s = e.col + n, c = `${o},${s}`;
			!i.has(c) && !a.has(c) && (a.add(c), r.push({
				row: o,
				col: s,
				value: 0
			}));
		}
		return r;
	}, [
		b,
		T,
		D,
		k,
		j,
		S
	]), N = t(() => {
		try {
			return b && M.length > 0 ? K({
				urlPrefix: f,
				version: m,
				ecLevel: g,
				artPixels: M,
				maskPattern: v
			}) : {
				grid: G({
					data: f,
					version: m,
					ecLevel: g,
					maskPattern: v
				}),
				decodedUrl: f,
				maskPattern: v ?? 0,
				overlayFlips: 0,
				maxFlips: 0,
				skippedFlips: 0,
				constrainedPixels: /* @__PURE__ */ new Set()
			};
		} catch (e) {
			return console.error("QR generation error:", e), null;
		}
	}, [
		f,
		m,
		g,
		v,
		M,
		b
	]), P = t(() => {
		let e = /* @__PURE__ */ new Set();
		if (!N || !("constrainedPixels" in N)) return e;
		let t = N.constrainedPixels;
		for (let n of t) {
			let [t, r] = n.split(",").map(Number), i = t - j.row - +!!S, a = r - j.col - +!!S;
			i >= 0 && i < k && a >= 0 && a < D && e.add(`${i},${a}`);
		}
		return e;
	}, [
		N,
		j,
		D,
		k,
		S
	]), F = t(() => N ? Y(N.grid, 10, 4) : "", [N]), I = e(() => {
		if (!F) return;
		let e = new Blob([F], { type: "image/svg+xml" }), t = URL.createObjectURL(e), n = document.createElement("a");
		n.href = t, n.download = "qr-art.svg", n.click(), URL.revokeObjectURL(t);
	}, [F]), L = {
		"--qr-bg": "var(--qr-theme-bg)",
		"--qr-fg": "var(--qr-theme-fg)",
		"--qr-muted": "var(--qr-theme-muted)",
		"--qr-border": "var(--qr-theme-border)",
		"--qr-input-bg": "var(--qr-theme-input-bg)",
		"--qr-code-bg": "var(--qr-theme-code-bg)",
		"--qr-preview-bg": "var(--qr-theme-preview-bg)"
	}, R = d === "dark" ? "qr-art-dark" : d === "light" ? "qr-art-light" : "qr-art-auto";
	return /* @__PURE__ */ o("div", {
		className: `${R}${u ? ` ${u}` : ""}`,
		style: {
			...L,
			padding: 24,
			maxWidth: 1200,
			margin: "0 auto",
			fontFamily: "system-ui",
			color: "var(--qr-fg)"
		},
		children: [/* @__PURE__ */ a("style", { children: `
        .qr-art-light {
          --qr-theme-bg: #ffffff;
          --qr-theme-fg: #1a1a1a;
          --qr-theme-muted: #666666;
          --qr-theme-border: #dddddd;
          --qr-theme-input-bg: #ffffff;
          --qr-theme-code-bg: #f5f5f5;
          --qr-theme-preview-bg: #ffffff;
        }
        .qr-art-dark {
          --qr-theme-bg: transparent;
          --qr-theme-fg: #e4e4e7;
          --qr-theme-muted: #a1a1aa;
          --qr-theme-border: #3f3f46;
          --qr-theme-input-bg: #18181b;
          --qr-theme-code-bg: #27272a;
          --qr-theme-preview-bg: #ffffff;
        }
        .qr-art-auto {
          --qr-theme-bg: #ffffff;
          --qr-theme-fg: #1a1a1a;
          --qr-theme-muted: #666666;
          --qr-theme-border: #dddddd;
          --qr-theme-input-bg: #ffffff;
          --qr-theme-code-bg: #f5f5f5;
          --qr-theme-preview-bg: #ffffff;
        }
        @media (prefers-color-scheme: dark) {
          .qr-art-auto {
            --qr-theme-bg: transparent;
            --qr-theme-fg: #e4e4e7;
            --qr-theme-muted: #a1a1aa;
            --qr-theme-border: #3f3f46;
            --qr-theme-input-bg: #18181b;
            --qr-theme-code-bg: #27272a;
            --qr-theme-preview-bg: #ffffff;
          }
        }
        .${R} input, .${R} select, .${R} button {
          color: var(--qr-theme-fg);
          background: var(--qr-theme-input-bg);
          border: 1px solid var(--qr-theme-border);
          border-radius: 4px;
        }
        .${R} fieldset {
          border-color: var(--qr-theme-border);
        }
        .${R} legend {
          color: var(--qr-theme-fg);
        }
        .${R} label {
          color: var(--qr-theme-fg);
        }
      ` }), /* @__PURE__ */ o("div", {
			style: {
				display: "flex",
				gap: 32,
				flexWrap: "wrap"
			},
			children: [/* @__PURE__ */ o("div", {
				style: {
					flex: "1 1 360px",
					minWidth: 0,
					maxWidth: 600
				},
				children: [
					/* @__PURE__ */ o("fieldset", {
						style: {
							border: "1px solid var(--qr-border)",
							borderRadius: 8,
							padding: 16,
							marginBottom: 16
						},
						children: [/* @__PURE__ */ a("legend", { children: "URL Prefix" }), /* @__PURE__ */ a("input", {
							type: "text",
							value: f,
							onChange: (e) => p(e.target.value),
							style: {
								width: "100%",
								padding: 8,
								fontSize: 14,
								boxSizing: "border-box",
								background: "var(--qr-input-bg)",
								color: "var(--qr-fg)",
								border: "1px solid var(--qr-border)",
								borderRadius: 4
							}
						})]
					}),
					/* @__PURE__ */ o("fieldset", {
						style: {
							border: "1px solid var(--qr-border)",
							borderRadius: 8,
							padding: 16,
							marginBottom: 16
						},
						children: [/* @__PURE__ */ a("legend", { children: "QR Settings" }), /* @__PURE__ */ o("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "1fr 1fr",
								gap: 12
							},
							children: [
								/* @__PURE__ */ o("label", { children: ["Version:", /* @__PURE__ */ a("select", {
									value: m,
									onChange: (e) => h(Number(e.target.value)),
									style: {
										display: "block",
										width: "100%",
										padding: 6,
										marginTop: 4,
										background: "var(--qr-input-bg)",
										color: "var(--qr-fg)",
										border: "1px solid var(--qr-border)",
										borderRadius: 4
									},
									children: [
										2,
										3,
										4,
										5,
										6
									].map((e) => /* @__PURE__ */ o("option", {
										value: e,
										children: [
											"V",
											e,
											" (",
											17 + e * 4,
											"×",
											17 + e * 4,
											")"
										]
									}, e))
								})] }),
								/* @__PURE__ */ o("label", { children: ["EC Level:", /* @__PURE__ */ o("select", {
									value: g,
									onChange: (e) => _(e.target.value),
									style: {
										display: "block",
										width: "100%",
										padding: 6,
										marginTop: 4,
										background: "var(--qr-input-bg)",
										color: "var(--qr-fg)",
										border: "1px solid var(--qr-border)",
										borderRadius: 4
									},
									children: [
										/* @__PURE__ */ a("option", {
											value: "L",
											children: "L (7%)"
										}),
										/* @__PURE__ */ a("option", {
											value: "M",
											children: "M (15%)"
										}),
										/* @__PURE__ */ a("option", {
											value: "Q",
											children: "Q (25%)"
										}),
										/* @__PURE__ */ a("option", {
											value: "H",
											children: "H (30%)"
										})
									]
								})] }),
								/* @__PURE__ */ o("label", { children: ["Mask:", /* @__PURE__ */ o("select", {
									value: v === void 0 ? "auto" : v,
									onChange: (e) => y(e.target.value === "auto" ? void 0 : Number(e.target.value)),
									style: {
										display: "block",
										width: "100%",
										padding: 6,
										marginTop: 4,
										background: "var(--qr-input-bg)",
										color: "var(--qr-fg)",
										border: "1px solid var(--qr-border)",
										borderRadius: 4
									},
									children: [/* @__PURE__ */ a("option", {
										value: "auto",
										children: "Auto"
									}), [
										0,
										1,
										2,
										3,
										4,
										5,
										6,
										7
									].map((e) => /* @__PURE__ */ o("option", {
										value: e,
										children: ["Pattern ", e]
									}, e))]
								})] })
							]
						})]
					}),
					/* @__PURE__ */ o("fieldset", {
						style: {
							border: "1px solid var(--qr-border)",
							borderRadius: 8,
							padding: 16,
							marginBottom: 16,
							minWidth: 0
						},
						children: [
							/* @__PURE__ */ a("legend", { children: "Pixel Art" }),
							/* @__PURE__ */ o("label", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8,
									marginBottom: 12
								},
								children: [/* @__PURE__ */ a("input", {
									type: "checkbox",
									checked: b,
									onChange: (e) => x(e.target.checked)
								}), "Enable art overlay"]
							}),
							b && /* @__PURE__ */ o(i, { children: [
								/* @__PURE__ */ o("label", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 8,
										marginBottom: 12
									},
									children: [/* @__PURE__ */ a("input", {
										type: "checkbox",
										checked: S,
										onChange: (e) => C(e.target.checked)
									}), "White border around art"]
								}),
								/* @__PURE__ */ o("div", {
									style: { marginBottom: 12 },
									children: [/* @__PURE__ */ a("label", {
										style: {
											fontSize: 13,
											display: "block",
											marginBottom: 4
										},
										children: "Type text (A-Z, 0-9, ♥♡★∞):"
									}), /* @__PURE__ */ o("div", {
										style: {
											display: "flex",
											gap: 8
										},
										children: [/* @__PURE__ */ a("input", {
											type: "text",
											placeholder: "e.g. R♥A, LOVE, HI!",
											style: {
												flex: 1,
												padding: 6,
												fontSize: 14,
												boxSizing: "border-box",
												background: "var(--qr-input-bg)",
												color: "var(--qr-fg)",
												border: "1px solid var(--qr-border)",
												borderRadius: 4
											},
											onKeyDown: (e) => {
												if (e.key === "Enter") {
													let t = H(e.target.value);
													t && (E(t.grid.map((e) => [...e])), O(t.width), A(t.height));
												}
											},
											id: "qr-art-text-input"
										}), /* @__PURE__ */ a("button", {
											onClick: () => {
												let e = document.getElementById("qr-art-text-input");
												if (!e) return;
												let t = H(e.value);
												t && (E(t.grid.map((e) => [...e])), O(t.width), A(t.height));
											},
											style: {
												padding: "6px 12px",
												cursor: "pointer",
												fontSize: 13,
												background: "var(--qr-input-bg)",
												color: "var(--qr-fg)",
												border: "1px solid var(--qr-border)",
												borderRadius: 4
											},
											children: "Render"
										})]
									})]
								}),
								/* @__PURE__ */ o("div", {
									style: {
										display: "flex",
										gap: 6,
										marginBottom: 12,
										alignItems: "center",
										flexWrap: "wrap"
									},
									children: [/* @__PURE__ */ a("span", {
										style: { fontSize: 13 },
										children: "Presets:"
									}), Object.entries(U).map(([e, t]) => /* @__PURE__ */ a("button", {
										onClick: () => {
											E(t.grid.map((e) => [...e])), O(t.width), A(t.height);
										},
										style: {
											padding: "3px 8px",
											fontSize: 11,
											cursor: "pointer",
											background: "var(--qr-input-bg)",
											color: "var(--qr-fg)",
											border: "1px solid var(--qr-border)",
											borderRadius: 4
										},
										children: e
									}, e))]
								}),
								/* @__PURE__ */ a(Q, {
									grid: T,
									width: D,
									height: k,
									onChange: E,
									onResize: (e, t) => {
										E($(T, e, t)), O(e), A(t);
									},
									constrainedCells: P
								}),
								/* @__PURE__ */ o("div", {
									style: {
										fontSize: 12,
										color: "var(--qr-muted)",
										marginTop: 8
									},
									children: [
										"Auto-placed at row ",
										j.row,
										", col ",
										j.col,
										P.size > 0 && /* @__PURE__ */ o("span", {
											style: { color: "#e74c3c" },
											children: [
												" ",
												"· ",
												P.size,
												" pixel",
												P.size > 1 ? "s" : "",
												" can't be satisfied (shown in red)"
											]
										})
									]
								})
							] })
						]
					}),
					N && /* @__PURE__ */ o("fieldset", {
						style: {
							border: "1px solid var(--qr-border)",
							borderRadius: 8,
							padding: 16,
							marginBottom: 16
						},
						children: [
							/* @__PURE__ */ a("legend", { children: "Output" }),
							/* @__PURE__ */ o("div", {
								style: { marginBottom: 8 },
								children: [/* @__PURE__ */ a("strong", { children: "Decoded URL:" }), /* @__PURE__ */ a("code", {
									style: {
										display: "block",
										padding: 8,
										background: "var(--qr-code-bg)",
										borderRadius: 4,
										marginTop: 4,
										wordBreak: "break-all",
										fontSize: 12,
										color: "var(--qr-fg)"
									},
									children: f + ("suffixBytes" in N ? N.suffixBytes.map((e) => e >= 48 && e <= 57 || e >= 65 && e <= 90 || e >= 97 && e <= 122 || [
										45,
										95,
										46,
										126
									].includes(e) ? String.fromCharCode(e) : "%" + e.toString(16).padStart(2, "0").toUpperCase()).join("") : "")
								})]
							}),
							"suffixBytes" in N && /* @__PURE__ */ o("div", {
								style: { marginBottom: 8 },
								children: [
									/* @__PURE__ */ a("strong", { children: "Suffix hex:" }),
									" ",
									/* @__PURE__ */ a("code", { children: N.suffixBytes.map((e) => e.toString(16).padStart(2, "0")).join(" ") })
								]
							}),
							/* @__PURE__ */ o("div", {
								style: { marginBottom: 8 },
								children: [
									/* @__PURE__ */ a("strong", { children: "Mask Pattern:" }),
									" ",
									N.maskPattern
								]
							}),
							/* @__PURE__ */ o("div", {
								style: { marginBottom: 8 },
								children: [
									/* @__PURE__ */ a("strong", { children: "EC Overlay:" }),
									" ",
									N.overlayFlips,
									" flips (max ",
									N.maxFlips,
									" correctable)",
									N.skippedFlips > 0 && /* @__PURE__ */ o("span", {
										style: { color: "#e67e22" },
										children: [
											" · ",
											N.skippedFlips,
											" skipped"
										]
									}),
									N.overlayFlips <= N.maxFlips ? " ✅" : " ⚠️"
								]
							}),
							/* @__PURE__ */ a("button", {
								onClick: I,
								style: {
									padding: "8px 16px",
									cursor: "pointer",
									background: "var(--qr-input-bg)",
									color: "var(--qr-fg)",
									border: "1px solid var(--qr-border)",
									borderRadius: 4
								},
								children: "Download SVG"
							})
						]
					})
				]
			}), /* @__PURE__ */ a("div", {
				style: {
					flex: "1 1 350px",
					minWidth: 300
				},
				children: /* @__PURE__ */ o("div", {
					style: {
						position: "sticky",
						top: 24
					},
					children: [
						/* @__PURE__ */ a("h3", {
							style: {
								marginTop: 0,
								color: "var(--qr-fg)"
							},
							children: "Preview"
						}),
						F ? /* @__PURE__ */ a("div", {
							dangerouslySetInnerHTML: { __html: F },
							style: {
								background: "var(--qr-preview-bg)",
								padding: 16,
								borderRadius: 8,
								border: "1px solid var(--qr-border)"
							}
						}) : /* @__PURE__ */ a("div", {
							style: {
								padding: 40,
								textAlign: "center",
								color: "var(--qr-muted)",
								border: "1px solid var(--qr-border)",
								borderRadius: 8
							},
							children: "Error generating QR code"
						}),
						l && N && /* @__PURE__ */ a(le, {
							grid: N.grid,
							artPixels: M
						})
					]
				})
			})]
		})]
	});
}
function le({ grid: e, artPixels: t }) {
	let n = new Set(t.map((e) => `${e.row},${e.col}`)), r = Math.min(12, Math.floor(500 / e.size)), i = {
		finder: "#e74c3c",
		separator: "#f39c12",
		timing: "#3498db",
		alignment: "#9b59b6",
		format: "#1abc9c",
		dark: "#2c3e50",
		data: "#ecf0f1"
	};
	return /* @__PURE__ */ o("div", {
		style: {
			marginTop: 16,
			overflowX: "auto"
		},
		children: [
			/* @__PURE__ */ a("h4", {
				style: { marginBottom: 8 },
				children: "Module Map"
			}),
			/* @__PURE__ */ a("div", {
				style: {
					display: "inline-grid",
					gridTemplateColumns: `repeat(${e.size}, ${r}px)`,
					gap: 1,
					background: "var(--qr-border, #ccc)",
					padding: 1,
					borderRadius: 4
				},
				children: e.types.flatMap((t, o) => t.map((t, s) => {
					let c = n.has(`${o},${s}`);
					return /* @__PURE__ */ a("div", {
						title: `[${o},${s}] ${t}${c ? " (ART)" : ""}`,
						style: {
							width: r,
							height: r,
							background: c ? "#ff6b6b" : i[t] || "#ecf0f1",
							opacity: e.modules[o][s] ? 1 : .3
						}
					}, `${o}-${s}`);
				}))
			}),
			/* @__PURE__ */ o("div", {
				style: {
					display: "flex",
					gap: 12,
					flexWrap: "wrap",
					marginTop: 8,
					fontSize: 12
				},
				children: [Object.entries(i).map(([e, t]) => /* @__PURE__ */ o("span", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 4
					},
					children: [/* @__PURE__ */ a("span", { style: {
						width: 12,
						height: 12,
						background: t,
						borderRadius: 2,
						display: "inline-block"
					} }), e]
				}, e)), /* @__PURE__ */ o("span", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 4
					},
					children: [/* @__PURE__ */ a("span", { style: {
						width: 12,
						height: 12,
						background: "#ff6b6b",
						borderRadius: 2,
						display: "inline-block"
					} }), "art"]
				})]
			})
		]
	});
}
//#endregion
export { U as PIXEL_ARTS, Q as PixelEditor, ce as QRArtGenerator, W as artToPixels, se as createEmptyGrid, q as findOptimalPosition, G as generateQR, K as generateQRWithArt, Y as gridToSVG, $ as resizeGrid, H as textToPixelArt };

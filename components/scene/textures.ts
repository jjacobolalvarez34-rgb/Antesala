import * as THREE from 'three';

/**
 * Texturas procedurales generadas en un <canvas> (sin descargas).
 * Escala: 1 unidad de UV = 1 metro (las geometrías escalan sus UV por tamaño).
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function finish(c: HTMLCanvasElement, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function speckle(ctx: CanvasRenderingContext2D, size: number, rand: () => number, amount: number, alpha: number) {
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(rand() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
}

export interface Cladding {
  map: THREE.Texture;
  bump: THREE.Texture;
  roughness: number;
  bumpScale: number;
  /** metros que cubre una repetición de la textura */
  tile: number;
}

/** Ladrillo bogotano: soga de 24 × 7 cm con junta de 1 cm. Tile de 1 m. */
export function brickTexture(seed = 7): Cladding {
  const S = 1024;
  const rand = mulberry32(seed);
  const color = canvas(S);
  const bump = canvas(S);
  const c = color.getContext('2d')!;
  const b = bump.getContext('2d')!;
  const mortar = 0.012 * S;
  const bw = 0.25 * S;
  const bh = 0.08 * S;
  c.fillStyle = '#bdb1a2';
  c.fillRect(0, 0, S, S);
  b.fillStyle = '#3a3a3a';
  b.fillRect(0, 0, S, S);
  const palette = ['#9a4a31', '#a9573a', '#8c4129', '#b2613f', '#93472f', '#a14f33', '#7f3b27'];
  for (let row = 0; row * bh < S; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < S + bw; x += bw) {
      const px = x + offset + mortar / 2;
      const py = row * bh + mortar / 2;
      const w = bw - mortar;
      const h = bh - mortar;
      c.fillStyle = palette[Math.floor(rand() * palette.length)]!;
      c.fillRect(px, py, w, h);
      // variación dentro del ladrillo
      const g = c.createLinearGradient(px, py, px + w, py + h);
      g.addColorStop(0, `rgba(255,220,190,${0.06 * rand()})`);
      g.addColorStop(1, `rgba(40,10,0,${0.12 * rand()})`);
      c.fillStyle = g;
      c.fillRect(px, py, w, h);
      const v = 170 + Math.floor(rand() * 50);
      b.fillStyle = `rgb(${v},${v},${v})`;
      b.fillRect(px, py, w, h);
    }
  }
  speckle(c, S, rand, 9000, 0.18);
  speckle(b, S, rand, 6000, 0.25);
  return { map: finish(color), bump: finish(bump, false), roughness: 0.92, bumpScale: 0.025, tile: 1 };
}

/** Pañete (estuco) claro con textura fina. Tile de 2 m. */
export function stuccoTexture(seed = 3, base = '#e9e4da'): Cladding {
  const S = 512;
  const rand = mulberry32(seed);
  const color = canvas(S);
  const bump = canvas(S);
  const c = color.getContext('2d')!;
  const b = bump.getContext('2d')!;
  c.fillStyle = base;
  c.fillRect(0, 0, S, S);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, S, S);
  speckle(c, S, rand, 14000, 0.08);
  speckle(b, S, rand, 14000, 0.5);
  // manchas suaves de intemperie
  for (let i = 0; i < 18; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 30 + rand() * 90;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(90,80,70,${0.05 * rand()})`);
    g.addColorStop(1, 'rgba(90,80,70,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }
  return { map: finish(color), bump: finish(bump, false), roughness: 0.95, bumpScale: 0.008, tile: 2 };
}

/** Concreto a la vista para losas y cornisas. Tile de 2 m. */
export function concreteTexture(seed = 11): Cladding {
  const t = stuccoTexture(seed, '#cfcbc3');
  return { ...t, roughness: 0.9, bumpScale: 0.01 };
}

/**
 * Atlas de interiores vistos a través del vidrio (4 variantes en 2 × 2):
 * pared cálida, luz de techo, mueble y cortinas a los lados.
 */
export function interiorAtlas(seed = 5) {
  const S = 512;
  const half = S / 2;
  const rand = mulberry32(seed);
  const cv = canvas(S);
  const c = cv.getContext('2d')!;
  const walls = ['#cdbfab', '#d8cdbd', '#bfb3a2', '#c9bba5'];
  for (let i = 0; i < 4; i++) {
    const ox = (i % 2) * half;
    const oy = Math.floor(i / 2) * half;
    const g = c.createLinearGradient(0, oy, 0, oy + half);
    g.addColorStop(0, '#f3e6d0');
    g.addColorStop(0.25, walls[i]!);
    g.addColorStop(1, '#5b4f43');
    c.fillStyle = g;
    c.fillRect(ox, oy, half, half);
    // luz de techo
    const lg = c.createRadialGradient(ox + half / 2, oy + 6, 2, ox + half / 2, oy + 6, half * 0.6);
    lg.addColorStop(0, 'rgba(255,240,215,0.75)');
    lg.addColorStop(1, 'rgba(255,240,215,0)');
    c.fillStyle = lg;
    c.fillRect(ox, oy, half, half);
    // mueble / cama (bloque bajo)
    c.fillStyle = ['#6b5a4a', '#8a7a68', '#4e463e', '#7b6553'][i]!;
    const fw = half * (0.35 + rand() * 0.25);
    c.fillRect(ox + half * 0.2 + rand() * half * 0.2, oy + half * 0.68, fw, half * 0.18);
    // cuadro
    c.fillStyle = 'rgba(60,50,40,0.5)';
    c.fillRect(ox + half * 0.55, oy + half * 0.32, half * 0.16, half * 0.12);
    // cortinas
    const curtain = ['#e8e1d4', '#d9d0c0', '#efe9df', '#cfc6b5'][i]!;
    c.fillStyle = curtain;
    const cw = half * (0.12 + rand() * 0.12);
    c.fillRect(ox, oy, cw, half);
    c.fillRect(ox + half - cw * (0.6 + rand() * 0.6), oy, cw * 1.2, half);
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let k = 0; k < 6; k++) c.fillRect(ox + (k * cw) / 6, oy, 1.5, half);
  }
  return finish(cv, true, false);
}

/** Fachada genérica de vecino: muro con ventanas en grilla. Tile 6 m × 3 m (un piso, dos ventanas). */
export function neighborFacadeTexture(kind: 'ladrillo' | 'estuco', seed = 1) {
  const W = 512;
  const H = 256;
  const rand = mulberry32(seed);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  c.fillStyle = kind === 'ladrillo' ? '#94503a' : '#d8d2c6';
  c.fillRect(0, 0, W, H);
  if (kind === 'ladrillo') {
    for (let y = 0; y < H; y += 6) {
      c.fillStyle = 'rgba(210,190,170,0.18)';
      c.fillRect(0, y, W, 1);
    }
  }
  speckle(c, W, rand, 3000, 0.12);
  // losa
  c.fillStyle = kind === 'ladrillo' ? '#b9b0a3' : '#c4bdb1';
  c.fillRect(0, H - 14, W, 14);
  // dos ventanas
  for (const x of [W * 0.12, W * 0.58]) {
    c.fillStyle = '#2b2f31';
    c.fillRect(x - 3, H * 0.28 - 3, W * 0.3 + 6, H * 0.46 + 6);
    const g = c.createLinearGradient(0, H * 0.28, 0, H * 0.74);
    g.addColorStop(0, '#7f949c');
    g.addColorStop(1, '#3e4b50');
    c.fillStyle = g;
    c.fillRect(x, H * 0.28, W * 0.3, H * 0.46);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(x + W * 0.15, H * 0.28, 2, H * 0.46);
  }
  const t = finish(cv);
  return t;
}

import * as THREE from 'three';

import type { TerrainCabin } from './types';

/**
 * Acabados de los refugios (D-083), dibujados en canvas (sin archivos): tablas de madera
 * verticales y muro de piedra. Se aplican con coordenadas del mundo (sin depender de las UV
 * de cada caja): así las tablas siguen derecho de un muro a otro.
 */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function planks(base: string, seed: number) {
  const [c, x] = canvas(512, 512);
  const r = rnd(seed);
  x.fillStyle = base;
  x.fillRect(0, 0, 512, 512);
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x0 = (i * 512) / n;
    // cada tabla con su tono y su veta
    x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${0.04 + r() * 0.08})`;
    x.fillRect(x0, 0, 512 / n, 512);
    for (let k = 0; k < 14; k++) {
      x.strokeStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`;
      x.lineWidth = 1 + r() * 1.5;
      const gx = x0 + 6 + r() * (512 / n - 12);
      x.beginPath();
      x.moveTo(gx, 0);
      x.bezierCurveTo(gx + r() * 6 - 3, 170, gx + r() * 6 - 3, 340, gx + r() * 4 - 2, 512);
      x.stroke();
    }
    // junta entre tablas
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(x0, 0, 3, 512);
  }
  return c;
}

function stone(seed: number) {
  const [c, x] = canvas(512, 512);
  const r = rnd(seed);
  x.fillStyle = '#5d5a52';
  x.fillRect(0, 0, 512, 512);
  let y = 0;
  while (y < 512) {
    const rowH = 40 + r() * 34;
    let px = -r() * 60;
    while (px < 512) {
      const w = 60 + r() * 90;
      const t = 0.55 + r() * 0.35;
      const g = Math.round(150 * t);
      x.fillStyle = `rgb(${g + 8},${g + 2},${g - 8})`;
      x.beginPath();
      const j = () => r() * 6 - 3;
      x.moveTo(px + 4 + j(), y + 4 + j());
      x.lineTo(px + w - 4 + j(), y + 4 + j());
      x.lineTo(px + w - 4 + j(), y + rowH - 4 + j());
      x.lineTo(px + 4 + j(), y + rowH - 4 + j());
      x.closePath();
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.06)';
      x.fillRect(px + 8, y + 8, w * 0.4, 3);
      px += w;
    }
    y += rowH;
  }
  return c;
}

const cache = new Map<string, THREE.Texture>();
function texture(key: string, make: () => HTMLCanvasElement) {
  let t = cache.get(key);
  if (!t) {
    t = new THREE.CanvasTexture(make());
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    cache.set(key, t);
  }
  return t;
}

/** Proyección con coordenadas del mundo: cada metro de muro repite la textura `scale` veces. */
function worldMapped<T extends THREE.MeshStandardMaterial>(m: T, scale: number): T {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
varying vec3 vWNor;`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vWNor = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
varying vec3 vWNor;`)
      .replace(
        '#include <map_fragment>',
        `vec2 wuv = abs(vWNor.x) > abs(vWNor.z) ? vec2(vWPos.z, vWPos.y) : vec2(vWPos.x, vWPos.y);
  if (abs(vWNor.y) > 0.7) wuv = vWPos.xz;
  vec4 sampledDiffuseColor = texture2D(map, wuv * ${scale.toFixed(3)});
  diffuseColor *= sampledDiffuseColor;`,
      );
  };
  m.customProgramCacheKey = () => `mundo-${scale}`;
  return m;
}

export interface CabinMaterials {
  walls: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  base: THREE.MeshStandardMaterial;
  deck: THREE.MeshStandardMaterial;
}

export function cabinMaterials(style: TerrainCabin['style']): CabinMaterials {
  const t = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ transparent: true, ...o });
  const walls =
    style === 'piedra'
      ? worldMapped(t({ map: texture('piedra', () => stone(11)), roughness: 0.95 }), 0.45)
      : style === 'clara'
        ? worldMapped(t({ map: texture('pino', () => planks('#c39a6b', 5)), roughness: 0.8 }), 0.5)
        : style === 'vidrio'
          ? worldMapped(t({ map: texture('carbon', () => planks('#3a3633', 9)), roughness: 0.75 }), 0.5)
          : worldMapped(t({ map: texture('nogal', () => planks('#5b4532', 3)), roughness: 0.82 }), 0.5);
  return {
    walls,
    roof: t({ color: style === 'piedra' ? '#3b3d3e' : '#2e3133', roughness: 0.55, metalness: 0.35 }),
    trim: t({ color: style === 'clara' ? '#3a2e24' : '#2a2622', roughness: 0.6 }),
    // de noche las ventanas se encienden por dentro (emissive, ver Cabin)
    glass: t({ color: '#2b3438', roughness: 0.08, metalness: 0.5, emissive: new THREE.Color('#ffbe73'), emissiveIntensity: 0, opacity: 0.92 }),
    base: t({ color: '#55524b', roughness: 1 }),
    deck: worldMapped(t({ map: texture('deck', () => planks('#7a5c40', 21)), roughness: 0.85 }), 0.6),
  };
}

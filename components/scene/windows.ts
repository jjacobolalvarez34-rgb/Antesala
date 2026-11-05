import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Ventanas con cuarto en paralaje ("interior mapping") y cortinas de tela
 * (D-030). Cada ventana es un quad en el plano del vidrio; el shader traza un
 * rayo dentro de una caja (pared del fondo, laterales, piso, techo) para que
 * el cuarto tenga profundidad real al mover la cámara. La luz de cada cuarto
 * sale de: hover de su unidad (uUnitLight), noche (algunos cuartos al azar) o
 * lobby (siempre encendido). Un segundo quad aditivo hace el resplandor.
 */

export const MAX_UNITS = 24;

/** Estilos de ventana: cortinas a los lados, visillo, lobby (sin cortinas, siempre encendido). */
export const STYLE = { panels: 0, sheer: 1, lobby: 2 } as const;

export interface WindowSpec {
  /** centro del quad (en coordenadas del grupo del piso) */
  center: [number, number, number];
  width: number;
  height: number;
  /** ángulo Y que orienta el quad hacia afuera */
  rotY: number;
  seed: number;
  /** índice de unidad para el hover, -1 si no es de una unidad de la demo */
  slot: number;
  style: number;
  /** celda del atlas de interiores (0..3) */
  cell: number;
}

export interface LightUniforms {
  uNight: { value: number };
  uUnitLight: { value: Float32Array };
}

export function createLightUniforms(): LightUniforms {
  return { uNight: { value: 0 }, uUnitLight: { value: new Float32Array(MAX_UNITS) } };
}

function buildQuads(specs: WindowSpec[], scale: number, outward: number) {
  if (!specs.length) return null;
  const parts = specs.map((s) => {
    const g = new THREE.PlaneGeometry(s.width * scale, s.height * scale);
    const n = g.attributes.position!.count;
    const room = new Float32Array(n * 4);
    const tangent = new Float32Array(n * 3);
    // el eje x local del quad, rotado como la geometría (rotateY no toca atributos propios)
    const tx = Math.cos(s.rotY);
    const tz = -Math.sin(s.rotY);
    for (let i = 0; i < n; i++) {
      room.set([s.cell, s.seed, s.slot, s.style], i * 4);
      tangent.set([tx, 0, tz], i * 3);
    }
    g.setAttribute('aRoom', new THREE.BufferAttribute(room, 4));
    g.setAttribute('aTangent', new THREE.BufferAttribute(tangent, 3));
    g.rotateY(s.rotY);
    const out = new THREE.Vector3(0, 0, outward).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rotY);
    g.translate(s.center[0] + out.x, s.center[1], s.center[2] + out.z);
    return g;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export const buildWindowGeometry = (specs: WindowSpec[]) => buildQuads(specs, 1, 0);
export const buildGlowGeometry = (specs: WindowSpec[]) => buildQuads(specs, 1.35, 0.25);

const common = /* glsl */ `
  uniform float uNight;
  uniform float uUnitLight[${MAX_UNITS}];
  varying vec4 vRoom;
  float hash1(float n) { return fract(sin(n) * 43758.5453123); }
  float roomLight() {
    float slot = vRoom.z;
    float unitL = 0.0;
    if (slot > -0.5) {
      int i = int(slot + 0.5);
      for (int k = 0; k < ${MAX_UNITS}; k++) { if (k == i) unitL = uUnitLight[k]; }
    }
    if (vRoom.w > 1.5) return max(unitL, 0.95); // lobby
    float nightLit = step(0.48, hash1(vRoom.y * 91.7)) * uNight * (0.7 + 0.3 * hash1(vRoom.y * 13.3));
    return max(unitL, nightLit);
  }
`;

export function createWindowMaterial(light: LightUniforms, atlas: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...light,
      uAtlas: { value: atlas },
      uLinen: { value: null as THREE.Texture | null },
      uHasLinen: { value: 0 },
      uDepth: { value: 1.15 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    vertexShader: /* glsl */ `
      attribute vec3 aTangent;
      attribute vec4 aRoom;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vT;
      varying vec3 vN;
      varying vec4 vRoom;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vT = normalize(mat3(modelMatrix) * aTangent);
        vN = normalize(mat3(modelMatrix) * normal);
        vRoom = aRoom;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform sampler2D uLinen;
      uniform float uHasLinen;
      uniform float uDepth;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vT;
      varying vec3 vN;
      ${common}
      void main() {
        vec3 V = normalize(vWorldPos - cameraPosition);
        // espacio del cuarto: x a lo ancho, y hacia arriba, z hacia adentro
        vec3 d = vec3(dot(V, vT), V.y, dot(V, -vN));
        d.z = max(d.z, 0.02);
        vec3 o = vec3(vUv, 0.0);
        float tx = d.x > 0.0 ? (1.0 - o.x) / d.x : (d.x < 0.0 ? -o.x / d.x : 1e5);
        float ty = d.y > 0.0 ? (1.0 - o.y) / d.y : (d.y < 0.0 ? -o.y / d.y : 1e5);
        float tz = uDepth / d.z;
        float t = min(min(tx, ty), tz);
        vec3 p = o + d * t;

        float L = roomLight();
        vec3 warm = vec3(1.0, 0.70, 0.42);
        float seed = vRoom.y;
        vec3 albedo;
        if (t == tz) {
          float cell = vRoom.x;
          vec2 off = vec2(mod(cell, 2.0) * 0.5, floor(cell / 2.0) < 0.5 ? 0.5 : 0.0);
          albedo = texture2D(uAtlas, off + clamp(p.xy, 0.01, 0.99) * 0.5).rgb;
        } else if (t == ty) {
          if (d.y < 0.0) {
            float plank = 0.88 + 0.12 * sin(p.x * 14.0 + floor(p.z * 4.0) * 2.1);
            albedo = vec3(0.36, 0.25, 0.16) * plank;
          } else {
            albedo = vec3(0.82, 0.8, 0.77);
          }
        } else {
          albedo = mix(vec3(0.78, 0.72, 0.64), vec3(0.70, 0.66, 0.6), hash1(seed * 7.0));
        }
        // lámpara de techo hacia el centro del cuarto
        float lamp = 1.0 - smoothstep(0.0, 0.9, length(vec2(p.x - 0.5, p.z - uDepth * 0.55)));
        float ceilingSpot = (t == ty && d.y > 0.0) ? (1.0 - smoothstep(0.0, 0.22, length(vec2(p.x - 0.5, p.z - uDepth * 0.55)))) : 0.0;
        vec3 dayAmb = mix(vec3(0.26, 0.27, 0.29), vec3(0.015, 0.02, 0.035), uNight);
        float deep = 1.0 - 0.45 * clamp(p.z / uDepth, 0.0, 1.0);
        vec3 col = albedo * (dayAmb * deep + warm * L * (0.75 + 1.1 * lamp)) + warm * ceilingSpot * L * 2.5;

        // cortinas
        float style = vRoom.w;
        if (style < 1.5) {
          float x = vUv.x;
          // pliegues: se atenúan cuando son más finos que un píxel (si no, hacen moiré a distancia)
          float foldPhase = x * 30.0 + seed * 20.0;
          float foldAA = clamp(1.0 - fwidth(foldPhase) * 0.6, 0.0, 1.0);
          float folds = 0.8 + 0.2 * foldAA * sin(foldPhase) * (0.55 + 0.45 * sin(x * 9.0 + seed * 3.0));
          // del lino solo se toma la variación suave del tejido (a esta escala el detalle fino hace ruido)
          float weave = uHasLinen > 0.5 ? dot(texture2D(uLinen, vUv * vec2(1.2, 1.6)).rgb, vec3(0.3333)) : 0.6;
          vec3 fabric = vec3(0.86, 0.83, 0.78) * mix(1.0, weave * 1.65, 0.28);
          fabric *= mix(vec3(0.97, 0.94, 0.88), vec3(0.9, 0.86, 0.8), hash1(seed * 2.3)) * folds;
          float left = 0.1 + 0.22 * hash1(seed * 3.1);
          float right = 0.1 + 0.22 * hash1(seed * 5.7);
          float edge = 0.015;
          float panel = 1.0 - smoothstep(left - edge, left + edge, x) + smoothstep(1.0 - right - edge, 1.0 - right + edge, x);
          float sheer = style > 0.5 ? 0.42 : 0.0;
          float cover = clamp(max(panel * 0.96, sheer), 0.0, 1.0);
          // luz de afuera sobre la tela y luz del cuarto que la atraviesa
          vec3 outside = mix(vec3(0.62, 0.63, 0.66), vec3(0.03, 0.035, 0.05), uNight);
          vec3 curtain = fabric * outside + fabric * warm * L * 1.05;
          col = mix(col, curtain, cover);
          // galería superior
          col *= 0.8 + 0.2 * smoothstep(0.0, 0.08, 1.0 - vUv.y);
        }
        gl_FragColor = vec4(col, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createGlowMaterial(light: LightUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: { ...light, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec4 aRoom;
      varying vec2 vUv;
      varying vec4 vRoom;
      void main() {
        vUv = uv;
        vRoom = aRoom;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      ${common}
      void main() {
        float L = roomLight();
        vec2 q = (vUv - 0.5) * vec2(1.0, 1.25);
        float fall = pow(clamp(1.0 - length(q) * 1.9, 0.0, 1.0), 2.2);
        float strength = L * fall * mix(0.12, 0.55, uNight) * uOpacity;
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.45) * strength, 1.0);
      }
    `,
  });
}

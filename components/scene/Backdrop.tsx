'use client';

import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';

import { envIntensity, type LightUniforms } from './windows';

/**
 * Render en dos capas (D-028). El entorno (calles, vecinos, árboles, cerros,
 * cielo) vive en su propia escena y NO se renderiza cada frame:
 *  - mientras la cámara se mueve (o cambia día/noche) se renderiza a baja
 *    resolución y se muestra desenfocado: se lee como profundidad de campo;
 *  - cuando la cámara se detiene se renderiza una vez en alta y se funde.
 * Cada frame solo se dibuja ese fondo y, encima, el edificio en vivo.
 */

/** Capa de lo que solo ve la cámara de la ventana (vecinos y árboles del corredor de vista). */
export const VIEW_ONLY_LAYER = 2;

const LOW_SCALE = 0.2;
const FADE_S = 0.45;

const quadShader = {
  uniforms: {
    tLow: { value: null as THREE.Texture | null },
    tHigh: { value: null as THREE.Texture | null },
    uMix: { value: 0 },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uBlur: { value: 1 },
    uGamma: { value: 0 },
    uStudio: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tLow;
    uniform sampler2D tHigh;
    uniform float uMix;
    uniform vec2 uTexel;
    uniform float uBlur;
    uniform float uGamma;
    uniform float uStudio;
    varying vec2 vUv;
    // ACES filmic igual al de three.js: al renderizar a textura three no aplica tone mapping
    vec3 rrtOdt(vec3 v) {
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }
    vec3 aces(vec3 color) {
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      color *= 1.0 / 0.6;
      color = outM * rrtOdt(inM * color);
      return clamp(color, 0.0, 1.0);
    }
    vec3 blurLow(vec2 uv) {
      vec3 c = vec3(0.0);
      float w = 0.0;
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          float k = 1.0 / (1.0 + float(x * x + y * y));
          c += texture2D(tLow, uv + vec2(float(x), float(y)) * uTexel * 1.25).rgb * k;
          w += k;
        }
      }
      return c / w;
    }
    void main() {
      vec3 low = uBlur > 0.5 ? blurLow(vUv) : texture2D(tLow, vUv).rgb;
      vec3 high = texture2D(tHigh, vUv).rgb;
      vec3 c = aces(mix(low, high, uMix));
      // fondo de estudio para la maqueta: carbón cálido con un foco al centro, para que
      // los muros claros se lean (lineal; en sRGB va de #5b554d a #2a2723)
      if (uStudio > 0.001) {
        float r = length((vUv - vec2(0.5, 0.58)) * vec2(1.25, 1.0));
        vec3 studio = mix(vec3(0.105, 0.091, 0.075), vec3(0.023, 0.020, 0.017), smoothstep(0.05, 0.9, r));
        c = mix(c, studio, uStudio);
      }
      if (uGamma > 0.5) {
        // para la vista desde la ventana (se lee como imagen sRGB)
        gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
      } else {
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    }
  `,
};

export interface BackdropApi {
  /** fuerza a renderizar de nuevo el fondo (p. ej. durante la transición día/noche) */
  invalidate: (frames?: number) => void;
  /** renderiza el entorno desde un punto y devuelve una imagen (vista desde una ventana) */
  snapshot: (from: THREE.Vector3, dir: THREE.Vector3, width: number, height: number) => string;
}

export function Backdrop({
  children,
  apiRef,
  environment,
  studio = false,
  reduced = false,
  light,
}: {
  /** hora del día: la intensidad del entorno del fondo sigue la del edificio */
  light?: LightUniforms;
  children: ReactNode;
  apiRef: React.RefObject<BackdropApi | null>;
  environment: THREE.Texture | null;
  /** fondo de estudio (maqueta de la unidad): el entorno deja de renderizarse */
  studio?: boolean;
  reduced?: boolean;
}) {
  const bgScene = useMemo(() => new THREE.Scene(), []);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const targets = useMemo(() => {
    // MSAA sobre half float exige EXT_color_buffer_float: varios GPU de celular no lo
    // tienen y devolvían la copia nítida en negro (se veía negro al quitarse el desenfoque)
    const msaa = gl.extensions.has('EXT_color_buffer_float') ? 4 : 0;
    const opts = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace };
    return {
      low: new THREE.WebGLRenderTarget(8, 8, { ...opts }),
      high: new THREE.WebGLRenderTarget(8, 8, { ...opts, samples: msaa }),
    };
  }, [gl]);
  useEffect(() => () => {
    targets.low.dispose();
    targets.high.dispose();
  }, [targets]);

  const state = useRef({
    last: new THREE.Matrix4(),
    lastProj: new THREE.Matrix4(),
    still: 0,
    captured: false,
    mix: 0,
    forced: 0,
    wasStudio: false,
  });

  useEffect(() => {
    const w = Math.max(2, Math.floor(size.width * dpr));
    const h = Math.max(2, Math.floor(size.height * dpr));
    targets.high.setSize(w, h);
    targets.low.setSize(Math.max(2, Math.floor(w * LOW_SCALE)), Math.max(2, Math.floor(h * LOW_SCALE)));
    // al cambiar de tamaño (barra del navegador en celular, cambio de calidad) las copias
    // quedan vacías: se vuelven a pintar aunque la cámara no se mueva
    state.current.captured = false;
    state.current.forced = Math.max(state.current.forced, 1);
  }, [size.width, size.height, dpr, targets]);

  useEffect(() => {
    bgScene.environment = environment;
  }, [bgScene, environment]);

  const quad = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(quadShader.uniforms),
      vertexShader: quadShader.vertexShader,
      fragmentShader: quadShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    material.uniforms.tLow!.value = targets.low.texture;
    material.uniforms.tHigh!.value = targets.high.texture;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return { scene, material, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [targets]);

  useEffect(() => {
    const u = quad.material.uniforms.uStudio!;
    gsap.to(u, { value: studio ? 1 : 0, duration: reduced ? 0 : 0.9, delay: reduced ? 0.45 : 0, ease: 'power2.inOut', overwrite: true });
  }, [studio, reduced, quad]);

  useEffect(() => {
    apiRef.current = {
      invalidate: (frames = 1) => {
        state.current.forced = Math.max(state.current.forced, frames);
        state.current.captured = false;
      },
      snapshot: (from, dir, width, height) => {
        const cam = new THREE.PerspectiveCamera(62, width / height, 0.3, 3000);
        cam.position.copy(from);
        cam.lookAt(from.clone().add(dir));
        cam.layers.enable(VIEW_ONLY_LAYER);
        // 1) entorno en HDR lineal; 2) tone mapping + gamma a 8 bits para leerlo
        const hdr = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
        const out = new THREE.WebGLRenderTarget(width, height);
        gl.setRenderTarget(hdr);
        gl.clear();
        gl.render(bgScene, cam);
        const u = quad.material.uniforms;
        const prev = { low: u.tLow!.value, mix: u.uMix!.value, blur: u.uBlur!.value };
        u.tLow!.value = hdr.texture;
        u.uMix!.value = 0;
        u.uBlur!.value = 0;
        u.uGamma!.value = 1;
        gl.setRenderTarget(out);
        gl.clear();
        gl.render(quad.scene, quad.camera);
        u.tLow!.value = prev.low;
        u.uMix!.value = prev.mix;
        u.uBlur!.value = prev.blur;
        u.uGamma!.value = 0;
        const pixels = new Uint8Array(width * height * 4);
        gl.readRenderTargetPixels(out, 0, 0, width, height, pixels);
        gl.setRenderTarget(null);
        hdr.dispose();
        out.dispose();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        const img = ctx.createImageData(width, height);
        // las filas vienen de abajo hacia arriba
        for (let y = 0; y < height; y++) {
          img.data.set(pixels.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
        }
        ctx.putImageData(img, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.88);
      },
    };
  }, [apiRef, bgScene, gl, quad]);

  useFrame((root, delta) => {
    const s = state.current;
    if (light) bgScene.environmentIntensity = envIntensity(light.uNight.value);
    camera.updateMatrixWorld();
    // la amortiguación de los controles mueve la cámara fracciones mínimas en cada cuadro:
    // con igualdad exacta el fondo nunca se quedaba quieto (y seguía desenfocado)
    const differs = (a: THREE.Matrix4, b: THREE.Matrix4, eps: number) =>
      a.elements.some((v, i) => Math.abs(v - b.elements[i]!) > eps);
    const moved = differs(s.last, camera.matrixWorld, 1e-3) || differs(s.lastProj, camera.projectionMatrix, 1e-5);
    s.last.copy(camera.matrixWorld);
    s.lastProj.copy(camera.projectionMatrix);

    const prevAutoClear = gl.autoClear;
    gl.autoClear = false;

    // con el estudio completo no hace falta renderizar el entorno
    const studioOnly = quad.material.uniforms.uStudio!.value > 0.999;
    if (studioOnly) {
      s.wasStudio = true;
      s.captured = false;
    } else if (s.wasStudio) {
      // al salir del estudio el fondo pudo quedar viejo: se vuelve a renderizar
      s.wasStudio = false;
      s.forced = Math.max(s.forced, 1);
    }
    if (!studioOnly && (moved || s.forced > 0)) {
      s.still = 0;
      s.captured = false;
      if (s.forced > 0) s.forced -= 1;
      gl.setRenderTarget(targets.low);
      gl.clear();
      gl.render(bgScene, camera);
      s.mix = 0;
    } else {
      s.still += 1;
    }

    if (!studioOnly && !s.captured && s.still >= 2) {
      gl.setRenderTarget(targets.high);
      gl.clear();
      gl.render(bgScene, camera);
      s.captured = true;
    }
    if (s.captured && s.mix < 1) s.mix = Math.min(1, s.mix + delta / FADE_S);

    quad.material.uniforms.uMix!.value = s.captured ? s.mix : 0;
    quad.material.uniforms.uTexel!.value.set(1 / targets.low.width, 1 / targets.low.height);

    gl.setRenderTarget(null);
    gl.clear();
    gl.render(quad.scene, quad.camera);
    gl.clearDepth();
    gl.render(root.scene, camera);
    gl.autoClear = prevAutoClear;
  }, 1);

  return <>{createPortal(children, bgScene)}</>;
}

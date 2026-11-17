'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';

/**
 * Visor 360° (D-084): un panorama equirectangular desde un punto fijo del espacio, a
 * pantalla completa. Se gira libre (arrastrar, también en el celular) y se acerca con la
 * rueda o con dos dedos. Arranca mirando hacia `yaw` (la ventana), en la convención de la
 * escena: dirección (cos yaw, 0, sin yaw), con -z al norte del plano.
 *
 * La imagen se lee por dirección en el shader (sin depender de cómo una esfera reparte la
 * textura): el centro de la imagen es el norte del plano y hacia la derecha va el oriente.
 */
export default function PanoViewer({ url, title, yaw = 0, onClose }: { url: string; title: string; yaw?: number; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, el.clientWidth / Math.max(1, el.clientHeight), 0.1, 100);
    const uniforms = { tMap: { value: null as THREE.Texture | null } };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float lon = atan(d.x, -d.z);
          float lat = asin(clamp(d.y, -1.0, 1.0));
          vec2 uv = vec2(0.5 + lon / 6.2831853, 0.5 + lat / 3.1415927);
          gl_FragColor = vec4(texture2D(tMap, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat);
    scene.add(sphere);
    let alive = true;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        if (!alive) return t.dispose();
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = THREE.RepeatWrapping;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        uniforms.tMap.value = t;
        setState('ready');
      },
      undefined,
      () => alive && setState('error'),
    );

    // mirada: rumbo (lon) y altura (lat); arrastrar gira, rueda o pellizco acercan
    let lon = yaw;
    let lat = -0.05;
    let vLon = 0;
    let vLat = 0;
    let fov = 75;
    let drag: { x: number; y: number } | null = null;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      drag = { x: e.clientX, y: e.clientY };
      vLon = vLat = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch) fov = THREE.MathUtils.clamp(fov * (pinch / d), 40, 95);
        pinch = d;
        return;
      }
      if (!drag) return;
      const k = (fov / 75) * 0.0058; // más sensible (Jacobo, 2026-11-16)
      vLon = -(e.clientX - drag.x) * k;
      vLat = (e.clientY - drag.y) * k;
      lon += vLon;
      lat = THREE.MathUtils.clamp(lat + vLat, -1.35, 1.35);
      drag = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (!pts.size) drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      fov = THREE.MathUtils.clamp(fov + e.deltaY * 0.04, 40, 95);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const dir = new THREE.Vector3();
    renderer.setAnimationLoop(() => {
      // inercia suave al soltar
      if (!drag) {
        lon += vLon;
        lat = THREE.MathUtils.clamp(lat + vLat, -1.35, 1.35);
        vLon *= 0.86;
        vLat *= 0.86;
      }
      camera.fov += (fov - camera.fov) * 0.2;
      camera.updateProjectionMatrix();
      dir.set(Math.cos(lon) * Math.cos(lat), Math.sin(lat), Math.sin(lon) * Math.cos(lat));
      camera.lookAt(dir);
      renderer.render(scene, camera);
    });
    return () => {
      alive = false;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      uniforms.tMap.value?.dispose();
      sphere.geometry.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, yaw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} en 360°`} className="fixed inset-0 z-[100] bg-ink text-bone">
      <div ref={host} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="pointer-events-auto rounded-md px-4 py-2 glass-dark">
          <p className="font-display text-xl leading-none">{title}</p>
          <p className="mt-1 text-xs text-bone/70">Arrastra para mirar alrededor · rueda o dos dedos para acercarte</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el 360°"
          className="pointer-events-auto grid size-11 place-items-center rounded-full glass-dark transition-colors hover:bg-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      {state !== 'ready' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-[0.625rem] tracking-[0.3em] text-bone/60 uppercase">
          {state === 'loading' ? 'Cargando el 360°' : 'No se pudo cargar el 360°'}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

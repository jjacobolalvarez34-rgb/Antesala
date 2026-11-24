'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { useT } from '@/components/i18n/Lang';

/**
 * Visor de Gaussian Splatting (D-082): un espacio capturado (o un splat sintético
 * desde Blender) a pantalla completa, con su propio lienzo. Se carga solo cuando se
 * abre (import dinámico): Spark y el archivo no pesan en el resto del recorrido.
 *
 * Convención del archivo: la salida de los entrenadores (Postshot, Brush, LichtFeld)
 * viene con el eje Y hacia abajo (COLMAP); por eso se gira 180° en X. La cámara
 * arranca en el centro del espacio y se arrastra para mirar alrededor.
 */
export default function SplatViewer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const tr = useT();
  const host = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let alive = true;
    let cleanup = () => {};
    void (async () => {
      const [{ SparkRenderer, SplatMesh }, { OrbitControls }] = await Promise.all([
        import('@sparkjsdev/spark'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]);
      if (!alive) return;
      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#141312');
      const camera = new THREE.PerspectiveCamera(70, el.clientWidth / el.clientHeight, 0.02, 200);
      camera.position.set(0, 0, 0.6);
      const spark = new SparkRenderer({ renderer });
      scene.add(spark);
      const splat = new SplatMesh({
        url,
        onProgress: (e: ProgressEvent) => {
          if (alive && e.lengthComputable) setProgress(e.loaded / e.total);
        },
      });
      splat.quaternion.set(1, 0, 0, 0);
      scene.add(splat);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.target.set(0, 0, 0);
      controls.minDistance = 0.05;
      controls.maxDistance = 8;
      controls.rotateSpeed = 0.5;
      splat.initialized.then(
        () => alive && setState('ready'),
        () => alive && setState('error'),
      );
      const resize = () => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        camera.aspect = el.clientWidth / Math.max(1, el.clientHeight);
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });
      cleanup = () => {
        renderer.setAnimationLoop(null);
        ro.disconnect();
        controls.dispose();
        splat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => alive && setState('error'));
    return () => {
      alive = false;
      cleanup();
    };
  }, [url]);

  // Escape cierra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // en el <body>: dentro de la página quedaba debajo de la franja de la demo y de la barra de reserva
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title}: recorrido 3D`} className="fixed inset-0 z-[100] bg-ink text-bone">
      <div ref={host} className="absolute inset-0 touch-none" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="pointer-events-auto rounded-2xl px-4 py-2 glass-dark">
          <p className="font-display text-xl leading-none">{title}</p>
          <p className="mt-1 text-xs text-bone/70">Arrastra para mirar alrededor · rueda o pellizco para acercarte</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Cerrar el recorrido 3D')}
          className="pointer-events-auto grid size-11 place-items-center rounded-full glass-dark transition-colors hover:bg-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      {state !== 'ready' ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {state === 'loading' ? (
            <div className="flex flex-col items-center gap-3">
              <span className="block h-px w-40 overflow-hidden bg-bone/15">
                <span className="block h-full bg-bone/80 transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
              <span className="text-[0.625rem] tracking-[0.3em] text-bone/60 uppercase">Cargando el espacio</span>
            </div>
          ) : (
            <p className="text-sm text-bone/80">No se pudo cargar el recorrido 3D de este espacio.</p>
          )}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

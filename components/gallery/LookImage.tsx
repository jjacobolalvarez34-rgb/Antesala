'use client';

/* eslint-disable @next/next/no-img-element -- ver Gallery.tsx */
import { Move } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Foto para "mirar alrededor" (pedido de Jacobo, 2026-11-12): sin ser un 360°,
 * la cámara se puede mover. La imagen es un poco más grande que el marco; al
 * arrastrar (o inclinar el celular) se corre y gira apenas en perspectiva, con
 * inercia al soltar. Al abrir se mueve sola un momento para que se note.
 * Solo transform: fluido aunque haya 3D detrás.
 */
const S = 1.24; // margen para mover: 12 % por lado
const ROOM = (S - 1) / 2;

export function LookImage({
  src,
  alt,
  width,
  height,
  priority = false,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const el = frame.current;
    const im = img.current;
    if (!el || !im) return;
    // x, y en [-1, 1]: -1 = borde izquierdo / arriba; 1 = derecho / abajo
    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let vx = 0;
    let vy = 0;
    let dragging = false;
    let touched = false;
    let lx = 0;
    let ly = 0;
    let raf = 0;
    const born = performance.now();
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const paint = () => {
      im.style.transform =
        `perspective(1100px) rotateY(${(x * 3.5).toFixed(3)}deg) rotateX(${(-y * 2).toFixed(3)}deg) ` +
        `translate3d(${(-x * ROOM * 100).toFixed(3)}%, ${(-y * ROOM * 100).toFixed(3)}%, 0) scale(${S})`;
    };
    const tick = (now: number) => {
      raf = 0;
      if (!touched) {
        // paneo suave de presentación durante los primeros segundos
        const t = (now - born) / 1000;
        if (t < 4.5) {
          tx = Math.sin(t * 1.1) * 0.55;
          ty = Math.sin(t * 0.7) * 0.15;
        } else {
          tx = 0;
          ty = 0;
        }
      } else if (!dragging) {
        tx = clamp(tx + vx);
        ty = clamp(ty + vy);
        vx *= 0.9;
        vy *= 0.9;
      }
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      paint();
      const moving =
        dragging || Math.abs(tx - x) > 1e-4 || Math.abs(ty - y) > 1e-4 || Math.abs(vx) > 1e-4 || Math.abs(vy) > 1e-4 || (!touched && now - born < 5000);
      if (moving) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const firstTouch = () => {
      if (!touched) {
        touched = true;
        tx = x;
        ty = y;
        setHint(false);
      }
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      firstTouch();
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      vx = 0;
      vy = 0;
      el.setPointerCapture(e.pointerId);
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const w = el.clientWidth * ROOM;
      const h = el.clientHeight * ROOM;
      const dx = (e.clientX - lx) / w;
      // con el dedo solo se mueve de lado: el gesto vertical sigue siendo el scroll de la página
      const dy = e.pointerType === 'touch' ? 0 : (e.clientY - ly) / h;
      lx = e.clientX;
      ly = e.clientY;
      tx = clamp(tx - dx);
      ty = clamp(ty - dy);
      vx = -dx * 0.6;
      vy = -dy * 0.6;
    };
    const onUp = () => {
      dragging = false;
      wake();
    };
    // celular: inclinarlo también mueve la cámara (Android; iOS pide permiso y se omite)
    let base: { b: number; g: number } | null = null;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (dragging || e.gamma === null || e.beta === null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      firstTouch();
      tx = clamp((e.gamma - base.g) / 22);
      ty = clamp((e.beta - base.b) / 30);
      wake();
    };

    paint();
    wake();
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    window.addEventListener('deviceorientation', onTilt);
    const t = window.setTimeout(() => setHint(false), 5000);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      window.removeEventListener('deviceorientation', onTilt);
      window.clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src]);

  return (
    <div ref={frame} className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden select-none active:cursor-grabbing">
      <img
        ref={img}
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        draggable={false}
        fetchPriority={priority ? 'high' : undefined}
        className="absolute inset-0 size-full animate-in object-cover duration-500 ease-out fade-in will-change-transform"
      />
      <p
        aria-hidden
        className={`glass pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-ink transition-opacity duration-700 ${hint ? 'opacity-100' : 'opacity-0'}`}
      >
        <Move className="size-3.5" />
        Arrastra para mirar
      </p>
    </div>
  );
}

'use client';

import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { introPose, REDUCED_FADE_IN, REDUCED_FADE_OUT, type CameraPose } from '@/lib/building';

/**
 * Coreografía de cámara (DISENO.md §4): GSAP interpola coordenadas esféricas
 * alrededor de un objetivo. Un toque completa la transición; con
 * prefers-reduced-motion el cambio es inmediato (el fundido lo hace la capa).
 */

/** Lo que usamos de los OrbitControls de drei (three-stdlib no es dependencia directa). */
interface OrbitControlsImpl {
  target: THREE.Vector3;
  enabled: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

const DURATION = 1.4;
const BACK_FACTOR = 0.8;
const INTRO_DURATION = 2.2;

interface Props {
  pose: CameraPose;
  /** cambia cuando cambia la etapa (no con un resize) */
  stageKey: string;
  /** profundidad de la etapa: menor que la anterior = "atrás" */
  depth: number;
  intro: boolean;
  reduced: boolean;
  autoRotate: boolean;
}

interface State {
  radius: number;
  polar: number;
  azimuth: number;
  tx: number;
  ty: number;
  tz: number;
  shiftX: number;
  shiftY: number;
}

const toState = (p: CameraPose): State => ({
  radius: p.radius,
  polar: p.polar,
  azimuth: p.azimuth,
  tx: p.target[0],
  ty: p.target[1],
  tz: p.target[2],
  shiftX: p.shiftX,
  shiftY: p.shiftY,
});

function setCameraState(camera: THREE.Camera, controls: OrbitControlsImpl | null, s: State) {
  const sinP = Math.sin(s.polar);
  camera.position.set(
    s.tx + s.radius * sinP * Math.sin(s.azimuth),
    s.ty + s.radius * Math.cos(s.polar),
    s.tz + s.radius * sinP * Math.cos(s.azimuth),
  );
  camera.lookAt(s.tx, s.ty, s.tz);
  controls?.target.set(s.tx, s.ty, s.tz);
}

/** Estado actual leído de la cámara y los controles (respeta lo que el usuario orbitó). */
function readState(camera: THREE.Camera, controls: OrbitControlsImpl | null, shift: { x: number; y: number }): State {
  const target = controls?.target ?? new THREE.Vector3();
  const offset = camera.position.clone().sub(target);
  const sph = new THREE.Spherical().setFromVector3(offset);
  return {
    radius: sph.radius,
    polar: sph.phi,
    azimuth: sph.theta,
    tx: target.x,
    ty: target.y,
    tz: target.z,
    shiftX: shift.x,
    shiftY: shift.y,
  };
}

export function CameraRig({ pose, stageKey, depth, intro, reduced, autoRotate }: Props) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const shift = useRef({ x: pose.shiftX, y: pose.shiftY });
  const tween = useRef<gsap.core.Tween | null>(null);
  const prev = useRef<{ key: string; depth: number } | null>(null);
  const poseRef = useRef(pose);
  useEffect(() => {
    poseRef.current = pose;
  });

  // Transición por cambio de etapa
  useEffect(() => {
    if (!controls) return;
    const target = toState(poseRef.current);
    const first = prev.current === null;
    const prevKey = prev.current?.key ?? '';
    const back = !first && depth < prev.current!.depth;
    // giro entre fachadas: largo y suave; saltos de etapa grandes (p. ej. a la unidad): vuelo más largo
    const facadeTurn = prevKey.startsWith('explorar-') && stageKey.startsWith('explorar-');
    const bigJump = !first && Math.abs(depth - (prev.current?.depth ?? depth)) >= 2;
    prev.current = { key: stageKey, depth };

    const from = first
      ? toState(intro && !reduced ? introPose(poseRef.current) : poseRef.current)
      : readState(camera, controls, shift.current);

    // camino corto en azimut
    let dAz = target.azimuth - from.azimuth;
    dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
    target.azimuth = from.azimuth + dAz;

    const duration = reduced
      ? 0
      : first
        ? intro
          ? INTRO_DURATION
          : 0
        : facadeTurn
          ? 2.6
          : bigJump
            ? 1.9
            : DURATION * (back ? BACK_FACTOR : 1);
    const state = { ...from };
    tween.current?.kill();
    controls.enabled = false;
    document.documentElement.dataset.camera = 'moving';

    const settle = () => {
      controls.enabled = true;
      document.documentElement.dataset.camera = 'idle';
    };
    const update = () => {
      shift.current = { x: state.shiftX, y: state.shiftY };
      setCameraState(camera, controls, state);
    };

    if (duration === 0) {
      // movimiento reducido (DISENO.md §4, regla 7): en vez de un salto seco, fundido corto
      const canvas = gl.domElement;
      if (reduced && !first) {
        const fade = gsap.timeline();
        fade
          .to(canvas, { opacity: 0, duration: REDUCED_FADE_OUT, ease: 'power1.in' })
          .add(() => {
            Object.assign(state, target);
            update();
          })
          // se queda en negro un momento: el fondo nítido, el estudio y la maqueta terminan de
          // cambiar antes de aparecer (si no, se veía el corte después del fundido)
          .to(canvas, { opacity: 1, duration: REDUCED_FADE_IN, delay: 0.35, ease: 'power1.out', onComplete: settle });
        return () => {
          fade.kill();
          canvas.style.opacity = '1';
        };
      }
      Object.assign(state, target);
      update();
      settle();
      return;
    }
    tween.current = gsap.to(state, {
      ...target,
      duration,
      ease: first || bigJump ? 'power3.inOut' : facadeTurn ? 'sine.inOut' : 'power2.inOut',
      onUpdate: update,
      onComplete: settle,
    });
    return () => {
      tween.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se anima al cambiar de etapa
  }, [stageKey, controls]);

  // Resize: se reencuadra sin animación
  useEffect(() => {
    if (!controls || tween.current?.isActive()) return;
    const state = toState(poseRef.current);
    const current = readState(camera, controls, shift.current);
    state.azimuth = current.azimuth;
    state.polar = current.polar;
    shift.current = { x: state.shiftX, y: state.shiftY };
    setCameraState(camera, controls, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia el tamaño
  }, [size.width, size.height]);

  // Un toque durante la transición la completa
  useEffect(() => {
    const el = gl.domElement;
    const skip = () => {
      if (tween.current?.isActive()) tween.current.progress(1);
    };
    el.addEventListener('pointerdown', skip);
    return () => el.removeEventListener('pointerdown', skip);
  }, [gl]);

  useEffect(() => {
    if (!controls) return;
    controls.autoRotate = autoRotate && !reduced;
    controls.autoRotateSpeed = 0.35;
  }, [controls, autoRotate, reduced]);

  // Desplazamiento de la vista para dejar sitio a los paneles
  useFrame(() => {
    const { x, y } = shift.current;
    if (Math.abs(x) < 1e-4 && Math.abs(y) < 1e-4) {
      if (camera.view?.enabled) camera.clearViewOffset();
      return;
    }
    camera.setViewOffset(size.width, size.height, x * size.width, y * size.height, size.width, size.height);
  });

  return null;
}

'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { BuildingFrame } from '@/lib/building';

/**
 * Entorno de maqueta: suelo, calles, manzanas vecinas en volumen, cerros al
 * fondo y cielo en degradé. Todo procedural y liviano (sin texturas).
 * Los vecinos van en tono más oscuro para que el edificio sea protagonista.
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

function Neighbors({ frame }: { frame: BuildingFrame }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const blocks = useMemo(() => {
    const rand = mulberry32(42);
    const [cx, cz] = frame.center;
    const out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    const cell = 26;
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 2; j++) {
        if (i === 0 && j === 0) continue;
        // el cuadrante hacia la cámara (frente-derecha) queda despejado
        if (i >= 0 && j >= 0 && i + j <= 3) continue;
        const x = cx + i * cell + (rand() - 0.5) * 4;
        const z = cz + j * cell + (rand() - 0.5) * 4;
        // dos o tres volúmenes por manzana
        const n = 1 + Math.floor(rand() * 3);
        for (let k = 0; k < n; k++) {
          const w = 7 + rand() * 9;
          const d = 7 + rand() * 9;
          const ring = Math.max(Math.abs(i), Math.abs(j));
          const floors = 1 + Math.floor(rand() * (ring === 1 ? 3 : 5));
          const bx = x + (rand() - 0.5) * 10;
          const bz = z + (rand() - 0.5) * 10;
          const overlaps = (x0: number, x1: number, z0: number, z1: number) =>
            bx + w / 2 > x0 && bx - w / 2 < x1 && bz + d / 2 > z0 && bz - d / 2 < z1;
          const frontStreet = cz + frame.depth / 2 + 7;
          const sideStreet = cx + frame.width / 2 + 7;
          if (
            overlaps(-Infinity, Infinity, frontStreet - 6, frontStreet + 6) ||
            overlaps(sideStreet - 6, sideStreet + 6, -Infinity, Infinity) ||
            overlaps(cx - frame.width / 2 - 6, cx + frame.width / 2 + 6, cz - frame.depth / 2 - 6, cz + frame.depth / 2 + 6)
          ) {
            continue;
          }
          out.push({ x: bx, z: bz, w, d, h: floors * 2.9 });
        }
      }
    }
    return out;
  }, [frame.center, frame.depth, frame.width]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Object3D();
    blocks.forEach((b, i) => {
      m.position.set(b.x, b.h / 2, b.z);
      m.scale.set(b.w, b.h, b.d);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color="#3a3733" roughness={0.95} />
    </instancedMesh>
  );
}

function Ridge({ frame }: { frame: BuildingFrame }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(700, 120, 70, 12);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = (y + 60) / 120; // 0 abajo, 1 arriba
      const crest = 38 + Math.sin(x / 47) * 14 + Math.sin(x / 19 + 1.7) * 6 + Math.sin(x / 7.3) * 1.5;
      pos.setY(i, t * crest);
      pos.setZ(i, -t * 30);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  // cerros orientales al fondo (−z)
  return (
    <mesh geometry={geo} position={[frame.center[0], -1, frame.center[1] - 170]}>
      <meshStandardMaterial color="#3d4a43" roughness={1} flatShading />
    </mesh>
  );
}

const skyShader = {
  uniforms: {
    top: { value: new THREE.Color('#0f1012') },
    horizon: { value: new THREE.Color('#4a3a2c') },
    glow: { value: new THREE.Color('#b0784a') },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 top;
    uniform vec3 horizon;
    uniform vec3 glow;
    varying vec3 vDir;
    void main() {
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 col = mix(horizon, top, pow(h, 0.45));
      // resplandor de atardecer hacia el occidente (+x, +z)
      float sun = pow(max(dot(normalize(vec3(vDir.x, 0.0, vDir.z)), normalize(vec3(0.6, 0.0, 0.8))), 0.0), 6.0);
      col += glow * sun * (1.0 - smoothstep(0.0, 0.35, h)) * 0.55;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function Context({ frame }: { frame: BuildingFrame }) {
  const [cx, cz] = frame.center;
  return (
    <group>
      <mesh scale={600}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial args={[skyShader]} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.15, cz]} receiveShadow>
        <circleGeometry args={[320, 48]} />
        <meshStandardMaterial color="#2b2926" roughness={1} />
      </mesh>
      {/* calles: frente (+z) y lateral (+x) */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.13, cz + frame.depth / 2 + 7]} receiveShadow>
        <planeGeometry args={[400, 9]} />
        <meshStandardMaterial color="#1f1e1c" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[cx + frame.width / 2 + 7, -0.13, cz]} receiveShadow>
        <planeGeometry args={[9, 400]} />
        <meshStandardMaterial color="#1f1e1c" roughness={1} />
      </mesh>
      <Neighbors frame={frame} />
      <Ridge frame={frame} />
    </group>
  );
}

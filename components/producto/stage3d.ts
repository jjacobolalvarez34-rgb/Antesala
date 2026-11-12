import * as THREE from 'three';

/**
 * Escenario del recorrido de la página de Antesala (D-063): el edificio de
 * Niebla Alta dibujado con líneas champán y ventanas de ranura (no el visor
 * completo, que vive en /h/niebla-alta). La cámara y el edificio cambian por
 * paso: 0 hero (giro lento), 1 edificio, 2 el piso sale, 3 la unidad desde
 * arriba, 4–6 de fondo bajo las capas.
 */
export interface StageOptions {
  floors: number;
  /** piso resaltado (1 = lobby) */
  hlFloor: number;
  /** índice de la unidad resaltada en ese piso (0..3, de izquierda a derecha) */
  hlUnit: number;
  reduced: boolean;
}

export interface StageApi {
  setStep: (n: number) => void;
  /** fromIntro: la cámara cae desde arriba después de la intro */
  start: (fromIntro: boolean) => void;
  dispose: () => void;
}

export function initStage(canvas: HTMLCanvasElement, host: HTMLElement, opts: StageOptions): StageApi | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const RM = opts.reduced;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x111b33, 40, 95);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 300);
  const C = { n2: 0x1c2b4c, hl: 0x2a3d66, champ: 0xd2b88c, luz: 0xf2e8d6, bisel: 0x957c55 };
  const Wd = 12;
  const D = 7;
  const FH = 1.1;
  const LOBBY = 1.6;
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => {
    disposables.push(o);
    return o;
  };

  const grid = new THREE.GridHelper(120, 60, 0x4a4a3e, 0x24304a);
  grid.position.y = -0.01;
  scene.add(grid);
  const plinthGeo = track(new THREE.BoxGeometry(Wd + 3, 0.12, D + 3));
  const plinth = new THREE.Mesh(plinthGeo, track(new THREE.MeshBasicMaterial({ color: 0x0b1224 })));
  plinth.position.y = -0.06;
  scene.add(plinth);
  const plinthEdges = new THREE.LineSegments(
    track(new THREE.EdgesGeometry(plinthGeo)),
    track(new THREE.LineBasicMaterial({ color: C.bisel, transparent: true, opacity: 0.5 })),
  );
  plinthEdges.position.y = -0.06;
  scene.add(plinthEdges);

  type Floor = {
    n: number;
    g: THREE.Group;
    baseY: number;
    face: THREE.MeshBasicMaterial;
    edge: THREE.LineBasicMaterial;
    mats: THREE.Material[];
    divMat?: THREE.LineBasicMaterial;
  };
  const floors: Floor[] = [];
  let y = 0;
  let unitGlow: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> | null = null;
  const winSlit = (g: THREE.Group, x: number, yy: number, z: number, h: number, lit: boolean, ry = 0) => {
    const m = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.13, h)),
      track(new THREE.MeshBasicMaterial({ color: lit ? C.luz : C.bisel, transparent: true, opacity: lit ? 0.95 : 0.45, side: THREE.DoubleSide })),
    );
    m.position.set(x, yy, z);
    m.rotation.y = ry;
    g.add(m);
    return m;
  };
  const top = opts.floors;
  for (let n = 1; n <= top; n++) {
    const h = n === 1 ? LOBBY : FH;
    const w = n === top ? 7.5 : Wd;
    const g = new THREE.Group();
    g.position.y = y;
    scene.add(g);
    // caras apenas veladas: el edificio se lee como trazos champán, no como un bloque azul
    const faceMat = track(new THREE.MeshBasicMaterial({ color: C.n2, transparent: true, opacity: 0.38 }));
    const bodyGeo = track(new THREE.BoxGeometry(w, h * 0.9, D));
    const body = new THREE.Mesh(bodyGeo, faceMat);
    body.position.y = h * 0.45 + 0.05;
    g.add(body);
    const edgeMat = track(new THREE.LineBasicMaterial({ color: C.champ, transparent: true, opacity: 0.6 }));
    const edges = new THREE.LineSegments(track(new THREE.EdgesGeometry(bodyGeo)), edgeMat);
    edges.position.copy(body.position);
    g.add(edges);
    const slabMat = track(new THREE.MeshBasicMaterial({ color: C.bisel, transparent: true, opacity: 1 }));
    const slab = new THREE.Mesh(track(new THREE.BoxGeometry(w + 0.35, 0.07, D + 0.35)), slabMat);
    slab.position.y = 0.035;
    g.add(slab);
    const wins: THREE.Mesh[] = [];
    const mats: THREE.Material[] = [faceMat, edgeMat, slabMat];
    let divMat: THREE.LineBasicMaterial | undefined;
    if (n === 1) {
      const glass = new THREE.Mesh(
        track(new THREE.PlaneGeometry(w - 2.4, h * 0.62)),
        track(new THREE.MeshBasicMaterial({ color: C.champ, transparent: true, opacity: 0.32 })),
      );
      glass.position.set(0, h * 0.42, D / 2 + 0.01);
      g.add(glass);
      mats.push(glass.material);
      for (let k = -4; k <= 4; k++) wins.push(winSlit(g, k * 1.05, h * 0.42, D / 2 + 0.02, h * 0.62, false));
    } else if (n === top) {
      for (let k = 0; k < 6; k++) wins.push(winSlit(g, -3 + k * 1.2, h * 0.5, D / 2 + 0.01, h * 0.62, k % 2 === 0));
    } else {
      for (let u = 0; u < 4; u++) {
        const cx = -4.5 + u * 3;
        const lit = (n * 7 + u * 3) % 5 !== 0;
        wins.push(winSlit(g, cx - 0.5, h * 0.5, D / 2 + 0.01, h * 0.62, lit));
        wins.push(winSlit(g, cx + 0.5, h * 0.5, D / 2 + 0.01, h * 0.62, lit && u % 2 === 0));
        wins.push(winSlit(g, cx, h * 0.5, -D / 2 - 0.01, h * 0.62, (n + u) % 3 !== 0));
      }
      for (let s = 0; s < 3; s++) {
        wins.push(winSlit(g, Wd / 2 + 0.01, h * 0.5, -2 + s * 2, h * 0.62, (n + s) % 2 === 0, Math.PI / 2));
        wins.push(winSlit(g, -Wd / 2 - 0.01, h * 0.5, -2 + s * 2, h * 0.62, (n + s) % 3 === 0, Math.PI / 2));
      }
      // divisiones de unidades sobre la losa del piso (se ven desde arriba)
      const pts: THREE.Vector3[] = [];
      for (let d = 1; d < 4; d++) {
        const dx = -Wd / 2 + d * 3;
        pts.push(new THREE.Vector3(dx, h * 0.9 + 0.06, -D / 2), new THREE.Vector3(dx, h * 0.9 + 0.06, D / 2));
      }
      divMat = track(new THREE.LineBasicMaterial({ color: C.champ, transparent: true, opacity: 0 }));
      g.add(new THREE.LineSegments(track(new THREE.BufferGeometry().setFromPoints(pts)), divMat));
      if (n === opts.hlFloor) {
        const gm = track(new THREE.MeshBasicMaterial({ color: C.luz, transparent: true, opacity: 0 }));
        unitGlow = new THREE.Mesh(track(new THREE.BoxGeometry(2.9, h * 0.9 + 0.02, D - 0.1)), gm);
        unitGlow.position.set(-4.5 + opts.hlUnit * 3, h * 0.45 + 0.05, 0);
        g.add(unitGlow);
      }
    }
    wins.forEach((m) => mats.push(m.material as THREE.Material));
    mats.forEach((m) => {
      if (m.userData.base == null) m.userData.base = m.opacity;
    });
    floors.push({ n, g, baseY: y, face: faceMat, edge: edgeMat, mats, divMat });
    y += h;
  }
  const HY = floors[opts.hlFloor - 1]!.baseY;
  const ux = -4.5 + opts.hlUnit * 3;

  const V = (a: number, b: number, c: number) => new THREE.Vector3(a, b, c);
  const shots: Record<number, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
    0: { pos: V(22, 9.5, 24), look: V(0, y * 0.5, 0) },
    1: { pos: V(17, 7, 23), look: V(0, y * 0.52, 0) },
    2: { pos: V(13, HY + 3.2, 16), look: V(0, HY + 0.6, 0) },
    3: { pos: V(ux + 1.3, HY + 17, 7.5), look: V(ux, HY + 0.6, 0) },
    4: { pos: V(ux, HY + 12, 4), look: V(ux - 0.2, HY + 0.6, 0) },
  };
  shots[5] = shots[4]!;
  shots[6] = shots[4]!;
  type Look = { fade: number; lift: number; hide: number; hl: number; unit: number };
  const looks: Record<number, Look> = {
    0: { fade: 0, lift: 0, hide: 0, hl: 0, unit: 0 },
    1: { fade: 0, lift: 0, hide: 0, hl: 0, unit: 0 },
    2: { fade: 0.82, lift: 1.5, hide: 0, hl: 1, unit: 0 },
    3: { fade: 0.6, lift: 1.5, hide: 1, hl: 1, unit: 1 },
    4: { fade: 0.6, lift: 1.5, hide: 1, hl: 1, unit: 1 },
  };
  looks[5] = looks[4]!;
  looks[6] = looks[4]!;

  const camPos = V(0.5, 70, 2);
  const camLook = V(0, 3, 0);
  const st: Look = { fade: 0, lift: 0, hide: 0, hl: 0, unit: 0 };
  let current = 0;
  let falling = false;
  let started = false;
  let orbit = 0;
  let visible = true;
  let last = performance.now();
  let raf = 0;
  const hlCol = new THREE.Color(C.hl);
  const baseCol = new THREE.Color(C.n2);
  const luzCol = new THREE.Color(C.luz);
  const champCol = new THREE.Color(C.champ);

  let needsRender = true;
  const resize = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    if (w > 860) {
      cam.fov = 30;
      cam.setViewOffset(w, h, -w * 0.2, 0, w, h); // escritorio: edificio a la derecha
    } else {
      cam.fov = 42;
      cam.setViewOffset(w, h, 0, h * 0.2, w, h); // celular: edificio arriba
    }
    cam.updateProjectionMatrix();
    needsRender = true;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver((es) => {
    visible = es[0]?.isIntersecting ?? true;
    needsRender = true;
  });
  io.observe(host);

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) {
      const shot = shots[current] ?? shots[0]!;
      const look = looks[current] ?? looks[0]!;
      const tPos = shot.pos.clone();
      if (current === 0 && !RM && started) {
        orbit += dt * 0.07;
        const a = Math.atan2(tPos.x, tPos.z) + Math.sin(orbit) * 0.35;
        const rad = Math.hypot(tPos.x, tPos.z);
        tPos.x = Math.sin(a) * rad;
        tPos.z = Math.cos(a) * rad;
      }
      let k = !started ? 0 : falling ? (RM ? 0.12 : 0.035) : RM ? 0.3 : 0.06;
      k = 1 - Math.pow(1 - k, dt * 60);
      // dibujar solo si algo se mueve: con la cámara quieta el scroll queda libre
      let moving = needsRender || (current === 0 && !RM && started);
      if (camPos.distanceToSquared(tPos) > 1e-6 || camLook.distanceToSquared(shot.look) > 1e-6) moving = true;
      camPos.lerp(tPos, k);
      camLook.lerp(shot.look, k);
      if (falling && camPos.distanceTo(tPos) < 0.6) falling = false;
      const ks = 1 - Math.pow(1 - (RM ? 0.3 : 0.08), dt * 60);
      (Object.keys(st) as (keyof Look)[]).forEach((p) => {
        if (Math.abs(look[p] - st[p]) > 1e-4) moving = true;
        st[p] += (look[p] - st[p]) * ks;
      });
      if (!moving) {
        raf = requestAnimationFrame(frame);
        return;
      }
      needsRender = false;
      for (const f of floors) {
        let op = 1;
        let dy = 0;
        if (f.n > opts.hlFloor) {
          op = 1 - Math.max(st.fade * 0.9, st.hide);
          dy = st.lift + st.hide * 2.5;
        } else if (f.n < opts.hlFloor) {
          op = 1 - st.fade * 0.75;
        }
        f.g.position.y = f.baseY + dy;
        for (const m of f.mats) {
          m.opacity = (m.userData.base as number) * op;
          m.visible = op > 0.01;
        }
        if (f.n === opts.hlFloor) {
          f.face.color.copy(baseCol).lerp(hlCol, st.hl);
          f.edge.color.copy(champCol).lerp(luzCol, st.hl);
          f.edge.opacity = 0.6 + 0.4 * st.hl;
        }
        if (f.divMat) f.divMat.opacity = f.n === opts.hlFloor ? st.unit * 0.9 : 0;
      }
      if (unitGlow) unitGlow.material.opacity = st.unit * 0.88;
      cam.position.copy(camPos);
      cam.lookAt(camLook);
      renderer.render(scene, cam);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    setStep: (n) => {
      current = n;
      needsRender = true;
    },
    start: (fromIntro) => {
      started = true;
      if (!fromIntro || current !== 0) {
        const sh = shots[current] ?? shots[0]!;
        camPos.copy(sh.pos);
        camLook.copy(sh.look);
        if (!fromIntro && !RM) camPos.y += 6;
      }
      falling = fromIntro;
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}

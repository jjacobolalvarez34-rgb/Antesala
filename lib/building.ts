import type { Building } from './types';

/**
 * Geometría pura del edificio procedural (CONTENIDO.md §5) y poses de cámara.
 * Coordenadas: footprint en metros sobre el plano XZ (x, z); Y hacia arriba.
 * Azimut 0 = mirando desde +z (frente).
 */

export interface BuildingFrame {
  center: [number, number];
  width: number;
  depth: number;
  height: number;
  floorHeight: number;
  floors: number;
  /** radio que envuelve el edificio (para encuadrar) */
  radius: number;
}

export function buildingFrame(b: Building): BuildingFrame {
  const xs = b.footprint.map((p) => p[0]);
  const zs = b.footprint.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const height = b.floors * b.floorHeightM;
  return {
    center: [(minX + maxX) / 2, (minZ + maxZ) / 2],
    width,
    depth,
    height,
    floorHeight: b.floorHeightM,
    floors: b.floors,
    radius: Math.hypot(width, depth, height) / 2,
  };
}

/** Altura de la losa inferior del piso (order empieza en 1). */
export const floorBaseY = (frame: BuildingFrame, order: number) => (order - 1) * frame.floorHeight;

/** Ancho objetivo de una crujía (ventana + machones), en metros. */
export const BAY = 2.7;
/** Retranqueo del frente en el último piso (terraza), en metros. */
export const SETBACK = 2.6;
export const bayCount = (length: number) => Math.max(1, Math.round(length / BAY));

type Pt = [number, number];

export interface Edge {
  index: number;
  a: Pt;
  dir: Pt;
  normal: Pt;
  length: number;
}

export function edgesOf(pts: Pt[]): Edge[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const dir: Pt = [dx / length, dz / length];
    let normal: Pt = [dir[1], -dir[0]];
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (normal[0] * (mid[0] - cx) + normal[1] * (mid[1] - cz) < 0) normal = [-normal[0], -normal[1]];
    return { index: i, a, dir, normal, length };
  });
}

/** Borde de la fachada principal (el que mira a +z). */
export const frontEdgeIndex = (pts: Pt[]) => {
  const edges = edgesOf(pts);
  return edges.reduce((best, e, i) => (e.normal[1] > edges[best]!.normal[1] ? i : best), 0);
};

/** Planta de un piso: igual al footprint, salvo el último, con el frente retranqueado. */
export function floorFootprint(b: Building, order: number): Pt[] {
  const pts = b.footprint as Pt[];
  if (order !== b.floors) return pts;
  const front = frontEdgeIndex(pts);
  const n = edgesOf(pts)[front]!.normal;
  return pts.map((q, i) =>
    i === front || i === (front + 1) % pts.length ? [q[0] - n[0] * SETBACK, q[1] - n[1] * SETBACK] : q,
  );
}

/**
 * Índice de una crujía visto desde afuera, de izquierda a derecha.
 * `bay` cuenta desde el vértice inicial del borde.
 */
export function viewerBay(edge: Edge, bay: number, bays: number): number {
  // derecha del observador que mira la fachada: (nz, −nx)
  const right: Pt = [edge.normal[1], -edge.normal[0]];
  return edge.dir[0] * right[0] + edge.dir[1] * right[1] >= 0 ? bay : bays - 1 - bay;
}

/**
 * Punto de vista desde una ventana (para la "vista desde la habitación"):
 * un poco afuera del vidrio, a la altura de los ojos de alguien de pie.
 */
export function windowViewpoint(
  b: Building,
  edgeIndex: number,
  order: number,
  windowIndex: number,
): { position: [number, number, number]; normal: [number, number] } | null {
  const edge = edgesOf(floorFootprint(b, order))[edgeIndex];
  if (!edge) return null;
  const bays = bayCount(edge.length);
  const raw = viewerBay(edge, windowIndex, bays);
  const t = ((raw + 0.5) * edge.length) / bays;
  return {
    position: [
      edge.a[0] + edge.dir[0] * t + edge.normal[0] * 0.6,
      (order - 1) * b.floorHeightM + 1.65,
      edge.a[1] + edge.dir[1] * t + edge.normal[1] * 0.6,
    ],
    normal: edge.normal,
  };
}

/** Cantidad de ventanas de una fachada (índice de borde) en un piso. */
export function windowsOn(b: Building, edgeIndex: number, order: number): number {
  const edge = edgesOf(floorFootprint(b, order))[edgeIndex];
  return edge ? bayCount(edge.length) : 0;
}

export interface Facade {
  /** índice del borde en el footprint */
  index: number;
  label: string;
  /** centro del borde (x, z) */
  center: [number, number];
  length: number;
  /** azimut desde el que se ve de frente */
  azimuth: number;
}

/**
 * Fachadas a partir de los bordes del footprint, empezando por la principal
 * (la que mira a +z, la calle) y siguiendo alrededor del edificio.
 * Bordes cortos (< 3 m) no cuentan como fachada.
 */
export function facadesOf(b: Building): Facade[] {
  const pts = b.footprint;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const TAU = 2 * Math.PI;
  const norm = (a: number) => ((a % TAU) + TAU) % TAU;
  const raw = pts
    .map((a, i) => {
      const c = pts[(i + 1) % pts.length]!;
      const dx = c[0] - a[0];
      const dz = c[1] - a[1];
      const length = Math.hypot(dx, dz);
      let nx = dz / length;
      let nz = -dx / length;
      const mx = (a[0] + c[0]) / 2;
      const mz = (a[1] + c[1]) / 2;
      if (nx * (mx - cx) + nz * (mz - cz) < 0) {
        nx = -nx;
        nz = -nz;
      }
      return { index: i, center: [mx, mz] as [number, number], length, azimuth: norm(Math.atan2(nx, nz)) };
    })
    .filter((f) => f.length >= 3);
  // orden por azimut, empezando por el más cercano a 0 (la calle, +z)
  raw.sort((p, q) => p.azimuth - q.azimuth);
  const dist0 = (a: number) => Math.min(a, TAU - a);
  const start = raw.reduce((best, f, i) => (dist0(f.azimuth) < dist0(raw[best]!.azimuth) ? i : best), 0);
  const ordered = [...raw.slice(start), ...raw.slice(0, start)];
  const names4 = ['Fachada principal', 'Costado derecho', 'Fachada posterior', 'Costado izquierdo'];
  return ordered.map((f, i) => ({
    ...f,
    label: ordered.length === 4 ? names4[i]! : i === 0 ? 'Fachada principal' : `Fachada ${i + 1}`,
  }));
}

export interface CameraPose {
  target: [number, number, number];
  /** coordenadas esféricas alrededor del target */
  radius: number;
  /** ángulo desde el eje Y (0 = cenital) */
  polar: number;
  /** ángulo alrededor de Y (0 = frente, +z) */
  azimuth: number;
  /** desplazamiento de la vista para dejar espacio a los paneles (fracción del lienzo) */
  shiftX: number;
  shiftY: number;
}

const DEG = Math.PI / 180;

/** Distancia para que una esfera de radio r quepa en el FOV vertical y horizontal. */
function fitDistance(r: number, fovDeg: number, aspect: number, margin = 1.15) {
  const vFov = fovDeg * DEG;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  return (r * margin) / Math.sin(Math.min(vFov, hFov) / 2);
}

/** Distancia para encuadrar un rectángulo ancho × alto visto de frente. */
function fitRect(w: number, h: number, fovDeg: number, aspect: number, margin: number) {
  const vFov = fovDeg * DEG;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  return Math.max((h * margin) / 2 / Math.tan(vFov / 2), (w * margin) / 2 / Math.tan(hFov / 2));
}

/**
 * Vista de una fachada: casi de frente y a altura de calle elevada, con un
 * leve giro para que se lea el volumen (como una foto de arquitectura).
 */
export function facadePose(
  f: BuildingFrame,
  facade: Facade,
  fov: number,
  aspect: number,
  panelSide: boolean,
): CameraPose {
  const portrait = aspect < 1;
  const toFacade = Math.hypot(facade.center[0] - f.center[0], facade.center[1] - f.center[1]);
  const radius = fitRect(facade.length + 4, f.height + 4, fov, aspect, portrait ? 1.1 : 1.6);
  return {
    target: [f.center[0], f.height * 0.47, f.center[1]],
    radius: radius + toFacade,
    polar: 82 * DEG,
    azimuth: facade.azimuth + 14 * DEG,
    shiftX: panelSide ? 0.02 : portrait ? 0.035 : 0,
    shiftY: portrait ? -0.02 : -0.03,
  };
}

/** Pose de entrada: alta y lejana; la cámara baja en arco hasta la fachada principal. */
export function introPose(arrival: CameraPose): CameraPose {
  return { ...arrival, radius: arrival.radius * 2.2, polar: 14 * DEG, azimuth: arrival.azimuth - 80 * DEG };
}

/** Separación del piso elegido hacia afuera de la fachada, en metros. */
export const FLOOR_PULL = 3.2;

/** Dirección (x, z) hacia afuera de una fachada. */
export const facadeDir = (facade: Facade): [number, number] => [Math.sin(facade.azimuth), Math.cos(facade.azimuth)];

/**
 * Maqueta de la unidad: vista cenital en 3/4, encuadrando el plano completo
 * (sizeX × sizeZ en metros) con centro en `target`.
 */
export function unitPose(
  target: [number, number, number],
  size: [number, number],
  facade: Facade,
  fov: number,
  aspect: number,
  layout: 'sheet' | 'side',
): CameraPose {
  const r = Math.hypot(size[0], size[1]) / 2 + 0.6;
  return {
    target,
    radius: fitDistance(r, fov, aspect, aspect < 1 ? 1.15 : 1.25),
    polar: 40 * DEG,
    azimuth: facade.azimuth + 24 * DEG,
    shiftX: layout === 'side' ? 0.16 : 0,
    shiftY: layout === 'sheet' ? 0.2 : 0,
  };
}

/** Un espacio de la unidad: acercamiento más bajo hacia su centro. */
export function spacePose(
  target: [number, number, number],
  facade: Facade,
  fov: number,
  aspect: number,
  layout: 'sheet' | 'side',
): CameraPose {
  return {
    target,
    radius: fitDistance(3.2, fov, aspect, 1.2),
    polar: 52 * DEG,
    azimuth: facade.azimuth + 30 * DEG,
    shiftX: layout === 'side' ? 0.2 : 0,
    shiftY: layout === 'sheet' ? 0.24 : 0,
  };
}

export function floorPose(
  f: BuildingFrame,
  order: number,
  facade: Facade,
  fov: number,
  aspect: number,
  layout: 'sheet' | 'side',
): CameraPose {
  const y = floorBaseY(f, order) + f.floorHeight * 0.5;
  const floorRadius = Math.hypot(f.width, f.depth) / 2;
  const [dx, dz] = facadeDir(facade);
  return {
    target: [f.center[0] + dx * FLOOR_PULL * 0.6, y, f.center[1] + dz * FLOOR_PULL * 0.6],
    radius: fitDistance(floorRadius, fov, aspect, aspect < 1 ? 1.4 : 1.45),
    polar: 58 * DEG,
    azimuth: facade.azimuth + 22 * DEG,
    shiftX: layout === 'side' ? 0.16 : 0,
    // en móvil el panel ocupa la parte baja: subimos el piso en la imagen
    shiftY: layout === 'sheet' ? 0.17 : 0,
  };
}

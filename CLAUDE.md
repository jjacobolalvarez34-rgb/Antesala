# CLAUDE.md — Antesala

Este archivo es el punto de entrada para Claude Code. Es corto a propósito; el detalle vive en `docs/`.

## Al empezar cada sesión

1. Lee este archivo completo.
2. Lee la **última entrada** de `docs/BITACORA.md`, para saber dónde quedamos.
3. Abre `docs/TAREAS.md` y ubica el bloque en curso y la siguiente tarea sin marcar.
4. Lee el doc que aplica a la tarea:

| Si vas a tocar… | Lee |
|---|---|
| Alcance, qué entra en la demo, textos de venta | `docs/PRODUCTO.md` |
| Stack, carpetas, tipos, rutas, rendimiento, despliegue | `docs/ARQUITECTURA.md` |
| Pantallas, tipografía, color, animación | `docs/DISENO.md` |
| Planos SVG, edificio, imágenes, 360°, pipeline de assets | `docs/CONTENIDO.md` |
| Orden de trabajo y criterios de cada bloque | `docs/PLAN.md` |
| Por qué se eligió algo | `docs/DECISIONES.md` |

## Al terminar cada sesión (obligatorio)

1. Marca en `docs/TAREAS.md` lo que quedó hecho (`[x]`) y agrega las tareas nuevas que aparecieron.
2. Agrega una entrada al **inicio** de `docs/BITACORA.md` con la plantilla de ese archivo.
3. Si se tomó una decisión de diseño o arquitectura, regístrala en `docs/DECISIONES.md`.
4. Si cambió algo estructural (tipos, rutas, convenciones), actualiza el doc correspondiente en el mismo commit.

## Qué estamos construyendo

**Antesala** es una plataforma B2B para hoteles boutique y apartahoteles en Colombia: el huésped explora el hotel antes de reservar (edificio 3D → piso → unidad → espacio en 360°/fotos → reservar).

**Fase actual: Fase 0, demo de venta.** Hotel ficticio *Niebla Alta*, un apartahotel urbano en Bogotá. Todo el contenido es sin captura real. Detalle en `docs/PRODUCTO.md`.

## Reglas no negociables

1. **Un visor genérico + contenido por hotel.** Un hotel nuevo es una carpeta en `content/hotels/<slug>/`, nunca código nuevo. Nada de textos, colores, precios ni logos del hotel dentro de componentes.
2. **Ningún componente asume qué medios existen.** Se renderiza lo que haya en cada espacio y se degrada con elegancia.
3. **El recorrido funciona completo sin 3D** (modo lista). Se construye primero y es el *fallback*.
4. **Móvil primero.** Se diseña a 390 px. El botón de reservar siempre está visible.
5. **Presupuestos de peso y FPS** de `docs/ARQUITECTURA.md` §8. Son criterios de aceptación, no sugerencias.
6. **Nada pesado se sirve desde Vercel.** Los assets pesados van a R2 en producción.
7. **Transparencia:** en la demo, todo medio lleva `fidelity: "ilustrativa"` y el banner de hotel ficticio es visible. Nunca usar fotos de hoteles reales identificables.
8. **Animación con propósito:** GSAP para cámara y escenas, Motion para interfaz. No agregar otras librerías de animación. Siempre respetar `prefers-reduced-motion`.

## Forma de trabajar

- Un bloque a la vez, en el orden de `docs/PLAN.md`. No adelantar trabajo de bloques futuros.
- **Verificación visual:** toda pantalla nueva o modificada se revisa con `pnpm shots` (390×844 y 1440×900) y **se miran las capturas** antes de darla por terminada.
- Antes de cerrar una tarea: `pnpm lint`, `pnpm typecheck` y `pnpm build` sin errores.
- Commits pequeños en español, uno por cambio lógico. Una rama por bloque (`bloque-2-exterior`).
- Si algo resulta inviable o se ve mal, **para y propone una alternativa** en vez de forzarlo, y deja la propuesta anotada en la bitácora.
- Verifica versiones actuales y compatibilidad antes de instalar. No fijes versiones de memoria.
- Usa la skill **frontend-design** al crear o rediseñar pantallas.
- Idioma: interfaz, docs y commits en español; código e identificadores en inglés.

## Comandos

```
pnpm dev          # desarrollo
pnpm build        # build de producción
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm shots        # capturas Playwright en tests/__shots__/
pnpm assets       # pipeline de assets: content/ → dist-assets/
```

## Contexto externo

- Plan maestro (doc vivo): https://claude.ai/artifact/4LwjYsWtkZxTNq6FA93Mu5
- Dueño del proyecto: Jacobo López. Trabaja en sesiones de noche entre semana y los sábados en la mañana, así que cada sesión debe dejar algo funcionando y la bitácora al día.

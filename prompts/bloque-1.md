# Prompt de arranque — Bloque 1 (Base)

Pégalo en Claude Code dentro del repo, con `CLAUDE.md`, `docs/` y `prompts/` ya subidos.

---

Lee `CLAUDE.md` y sigue su protocolo de inicio de sesión. Después lee `docs/ARQUITECTURA.md`, `docs/CONTENIDO.md` y `docs/DISENO.md`.

Vamos con el **Bloque 1: Base** (`docs/TAREAS.md`). Antes de escribir código, muéstrame en 10 líneas o menos el plan del bloque y las versiones que vas a instalar, verificadas como actuales y compatibles entre sí.

Detalles que no están en las tareas:

- `hotel.json` de Niebla Alta con textos en español, con tono de hotel boutique sobrio y sin superlativos. Precios simulados en COP, con `viewPremiumCOP` en los pisos 5 y 6.
- Unidades sugeridas: Estudio 201 (~32 m²), Suite con balcón 402 (~55 m²) y Penthouse 601 (~95 m² con terraza). Ajusta las medidas para que los planos sean realistas.
- Medios con rutas de placeholder y `fidelity: "ilustrativa"`. Genera placeholders livianos (gradientes o SVG con el nombre del espacio), no imágenes de internet.
- El modo lista debe verse terminado, no como esqueleto: es el *fallback* real y también se muestra al cliente.

Al terminar:
1. Corre lint, typecheck, build y shots, y revisa las capturas.
2. Dime qué ves bien, qué ves flojo y qué propones antes del Bloque 2.
3. Cumple el protocolo de cierre: actualiza `TAREAS.md`, `BITACORA.md` y, si hubo decisiones, `DECISIONES.md`.
4. Haz un commit por entregable, en la rama `bloque-1-base`.

# Plan de enchule — `feat/enchulame-las-fiestas-patrias`

Objetivo: dejar el **formulario público** (`/`) y el **panel admin** (`/admin`) al nivel de
nuestros proyectos nuevos: **mobile-first** y alineado al **rebranding Zapping 2026**.
`/vmix` NO se toca.

## Fuentes de verdad
- Design system: `~/zapping/zapping_yoko_ds` (tokens CSS en `src/styles/theme` + `src/styles/base`).
- Guía de marca 2026: https://brand.zapping.com/sistema
- Referencia de cómo estructuramos: `~/zapping/zapping-dashboard-monorepo`

## Decisiones RESUELTAS (por el equipo)
1. **Fondo oscuro** en todo, adaptado a marca 2026: **sin degradados**.
2. **Excepción dieciochera autorizada:** en el **formulario** se conservan **blanco + azul + rojo**
   (bandera) como acento del evento, sobre base oscura de marca. Zapink `#ff155b` sigue siendo el
   ancla de marca. Nada de amarillo, nada de degradados.
3. **Alcance admin:** ambos — **responsive mobile-first Y rebrand** completo.

## Bloques de trabajo

### Bloque 0 — Cimientos de tokens
- [ ] Portar los tokens relevantes de `yoko_ds` a `app/globals.css` (color, tipografía, espaciado 8px, radios, breakpoints).
- [ ] Corregir el ancla: `--pink/--lime` (`#e90068`) → **Zapink Pulse `#ff155b`**.
- [ ] Reemplazar grises arbitrarios por escala α (white-α / black-α).
- [ ] Añadir `<meta viewport>` y `font-size:16px` base (evita zoom iOS).

### Bloque 1 — Mobile-first (invertir el CSS)
- [ ] Base = móvil (1 columna); escalar con `@media (min-width)` usando breakpoints tokenizados.
- [ ] `.upload-layout` y `.field-grid` en columna única por defecto; grid solo desde `md`.
- [ ] Tipografía fluida coherente con la escala del DS (no `47px` fijos).
- [ ] Decoraciones (`.hero-fiesta`, badges, ribbons) que se adapten o se oculten limpio en móvil.

### Bloque 2 — Ergonomía del formulario en móvil
- [ ] Dropzone → primero botón grande "Subir foto" (target táctil ≥ mínimo del DS); drag&drop como mejora desktop.
- [ ] Inputs táctiles: label ≥ Bold, focus ring obligatorio, estados de error claros.
- [ ] Botón de envío accesible + estados de carga.

### Bloque 3 — Marca 2026
- [ ] Base oscura de marca (dark-900 `#080809`) en formulario y admin; sin degradados (`.pillar`, `::before/::after` de brillo).
- [ ] Acento dieciochero: blanco + azul + rojo en el formulario; Zapink `#ff155b` como ancla.
- [ ] Botones/chips como cápsula (pill); tarjetas `radius-24`; bordes 2px en vez de solo sombra.
- [ ] Sustituir flechas de texto (`↑ → ↗ ×`) y `✓ ◎` por **Phosphor Icons Bold**.
- [ ] Revisar voz (tú, puntos como percusión, sin emoji, remates en Black Italic).

### Bloque 4 — Admin usable en móvil
- [ ] Revisar `admin-dashboard.tsx` para uso desde teléfono (tablas/acciones táctiles).
- [ ] Aplicar mismos tokens y patrones mobile-first.

### Bloque 5 — Pulido y verificación
- [ ] Accesibilidad: contraste WCAG (3.0 gráfica / 4.5 texto), focus, `alt`.
- [ ] Motion Pulse si se anima (PVP 25%, salidas 1/3 de entradas, sin bounce).
- [ ] Verificar en 360 / 390 / 768 / 1280 px.
- [ ] `npm run build` + `npm run lint` en verde.

## Alcance explícito
- ✅ `app/page.tsx`, `app/upload-experience.tsx`, sección pública de `app/globals.css`
- ✅ `app/admin/*` (solo usabilidad móvil + branding)
- 🚫 `app/vmix/*` — intocable

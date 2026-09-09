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

### Bloque 2 — Ergonomía del formulario en móvil ✅
- [x] Dropzone → botón grande "Buscar foto" (target ≥ 48px); drag&drop mejora desktop.
- [x] Inputs táctiles: `font-size:16px`, `autoComplete`/`inputMode`/`enterKeyHint`, focus ring, error con icono.
- [x] Botón de envío accesible + estados de carga.

### Bloque 3 — Marca 2026 ✅
- [x] Base oscura `#080809` en formulario y admin; sin degradados.
- [x] Acento dieciochero blanco/azul/rojo en formulario; Zapink `#ff155b` como ancla.
- [x] Botones/chips pill; tarjetas `radius-24`; bordes en vez de solo sombra.
- [x] Phosphor Icons Bold inline reemplazan flechas/emoji de texto.
- [x] Fix logo footer (dark → white sobre fondo oscuro); remates en itálica (`em`).

### Bloque 4 — Admin usable en móvil ✅
- [x] `admin-dashboard.tsx` mobile-first: stats 2col, cards en columna, acciones táctiles ≥48px.
- [x] Mismos tokens; modal responsive; foco gestionado con `useRef` (sin `autoFocus`).

### Bloque 5 — Pulido y verificación ✅
- [x] Accesibilidad: focus ring global, `<a>`→`<Link>`, `rel=noopener`, foco de modal, `alt`.
- [x] `npm run build` en verde; 3 rutas 200.
- [x] Lint: de 6 → 2 errores (los 2 restantes son `setState-in-effect` fetch-on-mount
      pre-existentes; uno vive en `/vmix` intocable). Cero errores nuevos introducidos.

### Pendientes conocidos (no bloqueantes)
- Verificación visual manual en 360/390/768/1280 px (requiere ojo humano en navegador).
- Warnings `<img>`→`next/image`: pre-existentes; migrar es opcional (evento efímero).
- `setState-in-effect` del admin: falso positivo del linter (setState es async en el fetch).

## Alcance explícito
- ✅ `app/page.tsx`, `app/upload-experience.tsx`, sección pública de `app/globals.css`
- ✅ `app/admin/*` (solo usabilidad móvil + branding)
- 🚫 `app/vmix/*` — intocable

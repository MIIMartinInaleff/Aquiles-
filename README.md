# Aquiles World Gym · Sistema de administración

Sistema web para administrar el gimnasio. Lo usan Martín (dueño), José y Lourdes, desde PC y celular. Todo en español, pensado para ser simple.

- **Sitio:** https://aquiles-gym.vercel.app (Vercel, plan Hobby, se publica solo al hacer push a `main`)
- **Base de datos:** Supabase (proyecto `xbujsjsavlvsriiwqajv`)
- **Mercado Pago:** conectado (cuenta "JOSE LUIS", app "Sistema Aquiles")

> Este README es el mapa del proyecto: está escrito para que cualquiera (o Claude en otra sesión) sepa dónde está todo sin leer archivo por archivo.

---

## Dónde está cada cosa

| Archivo | Qué es |
|---|---|
| `src/app.js` | **Toda la app** (JS puro, sin framework). Es lo que se edita. |
| `src/style.html` | El bloque `<style>` completo (piel "oro"). |
| `src/logos.html` | Favicon, apple-touch-icon y logos en data URI (`window.__logo`, `window.__logoFull`). |
| `src/build.py` | Arma `index.html` juntando todo lo anterior + login + Supabase. |
| `index.html` | **Generado** por `src/build.py`. Es lo que sirve Vercel. No editar a mano. |
| `api/mp.js` | Función serverless de Vercel: lee los cobros/pagos de Mercado Pago. |
| `lib/supabase.min.js` | supabase-js 2.45.4 (servido desde el mismo dominio, no CDN, para evitar bloqueadores). |
| `lib/xlsx.full.min.js` | SheetJS 0.18.5. Se carga **solo cuando se exporta un Excel** (no al entrar). |

### Cómo hacer un cambio
1. Editar `src/app.js` (o `src/style.html`).
2. `python3 src/build.py` → regenera `index.html`.
3. Probar (ver "Pruebas").
4. Commit + push a `main` → Vercel publica en ~1 minuto.

`src/build.py` reutiliza el bloque cifrado (`const ENC=...`) del `index.html` actual. Solo hace falta re-cifrar si cambian los datos iniciales: `AWG_PW=<contraseña> python3 src/build.py` con un `src/data.json` local (que **nunca** se sube).

---

## Cómo funciona

### Login y datos
- Una sola contraseña para los tres usuarios (no está en el repo). Con ella:
  1. Se descifra el bloque `ENC` (AES-256-GCM, clave PBKDF2-SHA256 310k iteraciones, WebCrypto). Son los socios y pagos iniciales (desde julio) importados de los Excel.
  2. Se inicia sesión en Supabase con la cuenta del gym (el mail está en `SB_MAIL`, mismo password). El registro está cerrado.
  3. Se bajan todas las filas de `registros` (paginado de a 1000) y **reemplazan** al estado inicial (`hidratarDB`).
- Después se llama `boot(DATA)`, que ejecuta `src/app.js`.
- Si no hay Supabase (vista previa local, `window.__vista`), la app funciona con datos de ejemplo y no guarda.

### Base (Supabase)
Una sola tabla `public.registros`:

| columna | tipo |
|---|---|
| `col` | text (colección) |
| `id` | text |
| `data` | jsonb |
| `updated_at` | timestamptz |

PK `(col, id)`. RLS: solo `authenticated`. Está en la publicación de realtime.

| `col` | `id` | contenido |
|---|---|---|
| `soc` | N° de socio (`AWG123`) | socio |
| `cob` | id numérico (`nid()`) | cobro |
| `ing` | id | ingreso (check-in) |
| `gas` | `mes\|id` | gasto del mes |
| `trf` | id del pago de Mercado Pago | transferencia y su estado |
| `avi` | id numérico | socio incluido en un Excel de avisos |
| `cfg` | `cuotas`, `prods`, `pcamb`, `gtpl`, `alias`, `mpdesde` | configuración (`{v: ...}`) |

### Sincronización (en `src/app.js`, sección "sincronización con Supabase")
- `coleccion()` arma un mapa `col|id → JSON estable` (claves ordenadas, `stable()`).
- `SNAP` guarda lo último sincronizado. `sincronizar()` sube solo lo que cambió (upsert en lotes de 400) y borra lo que ya no está. Se dispara 500 ms después de cada `render()`.
- Realtime (`postgres_changes`) → `aplicar()` actualiza el estado local y re-renderiza (`refrescar()`, espera si hay un modal o input con foco).
- Estado visible en el menú: "✓ Guardado hh:mm" / "Guardando…" / "⚠ Sin conexión".

### Estructura de `src/app.js`
- Helpers de formato al principio (`ars`, `fmt`, `fmtS`, `hhmm`, `dniFmt`). **No usar `toLocaleString`/`toLocaleDateString`** en código que se repite: es muy lento (se reemplazaron por formato manual).
- Estado global: `SOC` (socios), `BYN` (Map N° → socio), `COB` (cobros), `INGRESOS`, `GMES` (gastos por mes), `GTPL` (plantilla de gastos), `CUOTAS`, `PRODS`, `TRF` (transferencias), `ALIAS` (CUIL → socio aprendido).
- `STATE` = estado de la interfaz (filtros, sección, formularios en curso).
- Vistas: `V.inicio`, `V.checkin`, `V.socios`, `V.cobrar`, `V.mp`, `V.avisos`, `V.fact`, `V.gastos`, `V.ajustes`. Cada una devuelve HTML (template literals).
- `render(keep)` dibuja la sección actual (`cur`) y llama `bind()`, que engancha los eventos por sección (`if(cur==="socios"){...}`).
- `ficha(n)` = modal con los datos del socio. `modal()`, `close()`, `toast()`.
- Menú: `SECS` (lista de secciones), `side()` (menú lateral en PC, barra abajo en celular).

### Fechas (importante)
- `Date.prototype.toJSON` está sobrescrito para guardar hora local con offset (Argentina, -03:00).
- `revD()` lee campos de "día" (los viejos con `T00:00:00.000Z` usan su Y-M-D UTC) para evitar el corrimiento de -3 h.

### Reglas de negocio
- **Estados del socio** (`est()`): `ok` activo, `warn` por vencer (≤ 7 días), `late` vencido (hasta 30 días), `off` inactivo (más de 30 días vencido o sin pagos). El filtro "Activos" incluye a los por vencer.
- **Vencimiento al cobrar una cuota:**
  - si el vencimiento actual es ≥ la fecha de pago → vencimiento + 30;
  - si no → fecha de pago + 30;
  - nunca queda un vencimiento en el pasado. La opción "Desde que venció" solo aparece si vencimiento + 30 > fecha de pago.
  - Cada cobro guarda `vto`; `recalcSocio()` recalcula el socio reproduciendo sus cobros.
- **Cuotas:** $47.000 normal; descuentos familiares $45.000 / $43.000; plan personalizado. Precios editables en Ajustes.
- **Cobrar:** método por defecto **Transferencia** (amarillo); Efectivo en verde; Mixto abajo.
- **"No es del gym":** transferencias que entran pero no son del gimnasio; no suman en Facturación.
- **Búsqueda** (`buscar()`, `coincide()`): sin acentos, por palabras, N° de socio (`450` o `AWG450`), DNI/teléfono con 4+ dígitos. Ordena primero activos y visitas recientes.

### Mercado Pago
- Token en Vercel → Settings → Environment Variables → `MP_ACCESS_TOKEN` (Secret, producción `APP_USR-...`). **Nunca** en el código ni en el chat.
- `api/mp.js` (`GET /api/mp?dias=N`, máx. 62): valida el JWT de Supabase del usuario, consulta `/v1/payments/search` y devuelve `{desde, pagos:[{id, fecha, monto, neto, nombre, doc, tipo, metodo, op, desc, dir}]}` con `dir` = `in` (entra) u `out` (sale).
  - Entra: `collector_id` = el gym. Las transferencias desde otro banco al CVU vienen como `operation_type: account_fund` con el gym como pagador y **sin documento de quien transfiere**.
  - Sale: pagos hechos desde la cuenta (MP no manda `collector_id`).
- En la app (`mpTraer()`, cada 60 s con la página visible):
  - Solo las transferencias posteriores a `cfg.mpdesde` (fecha en que se activó) entran a "Para confirmar".
  - `identificar()` reconoce al socio por DNI del CUIL, por `ALIAS` aprendido o por nombre. `yaCobrada()` la empareja con un cobro manual por transferencia del mismo monto (±3 días) para no contar dos veces.
  - Botones: Confirmar cobro, No es este socio, Es de un socio, Socio nuevo, No es del gym, Ya lo cargué.
  - Abajo: **Estadísticas de Mercado Pago** (`mpStats()`): entró, salió, quedó, promedio, gráfico por día, por dónde entró y lo que salió (Hoy / 7 días / mes actual / mes anterior).

### Secciones
1. **Inicio:** activos, ingresos de hoy, vencidos para cobrar, por vencer, aviso de transferencias sin identificar.
2. **Check-in:** registrar ingreso (QR pendiente), "Dejar pasar igual", borrar ingreso, gráficos de hoy, ayer y mes.
3. **Socios:** lista (100 por vez + "Mostrar más"), búsqueda, filtros, ficha con botón de WhatsApp, alta de socio, exportar a Excel.
4. **Cobrar:** cuotas, productos (con "Producto nuevo"), método de pago, pase gratis, fecha de pago, vencimiento.
5. **Transferencias:** Mercado Pago en vivo + estadísticas.
6. **Avisos:** Excel para WhatsApp con el formato "PARA ENVIAR" (vencen en 5 días o menos; vencidos hasta 30 días). Cada Excel descargado anota a esos socios en el historial `AVI` (colección `avi`: `{id, f, tipo:"por"|"ven", n, venc}`); abajo se ve "Ya avisados" de los últimos 30 días con si ya pagó. Los ya avisados para el mismo vencimiento vienen destildados y con la etiqueta "Ya avisado dd/mm".
7. **Facturación:** total, efectivo/transferencia, AOV, cobrado por día con tooltips, cuotas vs productos, últimos 190 cobros con "Corregir".
8. **Gastos:** punto de equilibrio, por categoría (luz/gas/agua agrupados), mes a mes, montos editables. Sin alquiler.
9. **Ajustes:** precios de cuotas y productos.

### Diseño
- Piel "oro": negro con degradés rojo/amarillo/naranja y texto blanco. Fuentes: **Archivo** expandida (títulos) y **Manrope** (texto).
- Menú lateral flotante redondeado y compacto (sin scroll) en PC; barra inferior en celular. Logo del gym en menú, login y favicon.
- El usuario prefiere **poco texto e interfaz simple**; listas en filas (no tarjetas) y sin scroll horizontal.

---

## Pruebas
Con Playwright (Chromium ya instalado en el entorno):
- Servir el build: `timeout 120 python3 -m http.server 8765` (no usar `pkill`).
- Contexto con `timezoneId: 'America/Argentina/Buenos_Aires'`.
- **Bloquear escrituras** a Supabase al probar con datos reales: `page.route(/supabase\.co\/rest\/v1\/registros/, r => r.request().method() !== 'GET' ? r.abort() : r.continue())`.
- `/api/mp` local: redirigir con `page.route` a `https://aquiles-gym.vercel.app/api/mp` o devolver `{"pagos":[]}`.
- Para medir velocidad como en un celular: CDP `Emulation.setCPUThrottlingRate {rate: 4}`.

---

## Reglas del proyecto
- **Datos reales nunca en texto plano en el repo.** `.gitignore` bloquea `*.xlsx`, `*.xls`, `*.csv`, `*.json`. Los socios solo viven cifrados en `index.html` y en Supabase.
- **Nunca** subir la contraseña, el token de Mercado Pago, la service_role key de Supabase ni la contraseña de la base.
- La key publishable de Supabase (`sb_publishable_...`) es pública por diseño (va en el HTML).
- Forma de trabajo con el usuario: explicar en **español** y simple; pedir confirmación antes de cambios grandes; cuando dice "publicalo", se publica directo en `main`. Si va a mandar Excel actualizados, esperar a que los mande antes de subir nada.

## Pendientes
- Lector QR para el check-in.
- Montos reales de gastos.
- Precios de remeras y shakers (socio / no socio) + flyer; stock de productos (opcional).
- Revisar discrepancias con el Excel: AWG580 (sistema 20/10 $47.000 vs Excel 17/10 $43.000) y AWG774 (sistema efectivo vs Excel transferencia).
- Hacer privado el repositorio de GitHub.
- Métricas de check-in por mes.

# Cartilla de precios (frente y dorso)

Versión final aprobada por el usuario (24/10/2026). Se imprime de los dos lados.

| Archivo | Qué es |
|---|---|
| `frente.jpg` | **PLANES:** cuotas, pack familiar y plan amigo |
| `dorso.jpg` | **TIENDA AQUILES:** remera oficial y shaker |
| `prompts.md` | Los prompts exactos usados para generar cada versión |

También se pueden ver publicadas en https://aquiles-gym.vercel.app/marketing/cartilla/frente.jpg y `.../dorso.jpg`.

## Precios y reglas

**Planes**
- Cuota mensual: **$47.000**
- Personalizado: **$70.000**
- **Pack familiar** (por persona, "c/u"): 2 personas **$45.000**, 3 o más **$43.000**. Exclusivo para socios con **3 meses o más** en el gym.
- **Plan Amigo:** el descuento es **solo para el socio** que trae amigos **nuevos** al gym (el amigo nuevo paga normal). Sin otras condiciones.
  - Trae 1 amigo → su cuota a **$40.000**
  - Trae 2 amigos → **2 meses** a **$40.000**

**Tienda**
| Producto | Socios +3 meses | Precio general |
|---|---|---|
| Remera oficial | **$27.500** | **$32.000** |
| Shaker | **$21.500** | **$25.000** |

> En el sistema (Ajustes) todavía figura el shaker a $9.000 y la remera a $27.500 sin precio general, y no existe el Plan Amigo. Falta cargarlos (ver Pendientes en el README principal).

## Cómo se hizo
- Generada con **Kie** (`api.kie.ai`) usando **GPT Image 2** (`gpt-image-2-image-to-image`), 2:3, 2K. El usuario **prefiere GPT Image ("ChatGPT") para folletos, no Nano Banana**.
- La clave está en la variable de entorno `KIE_API_KEY` del entorno de Claude (nunca en el repo).
- Flujo: subir imágenes de referencia a `https://kieai.redpandaai.co/api/file-stream-upload` → `POST /api/v1/jobs/createTask` → consultar `GET /api/v1/jobs/recordInfo?taskId=...` hasta `state: success` → bajar `resultJson.resultUrls[0]` (link temporal).
- Referencias: el logo (`window.__logoFull` de `src/logos.html`, agrandado sobre fondo negro) y una foto real de la espalda de la remera (blanca con estampa negra: casco con barra, "AQUILES" en vertical, "WORLD GYM" abajo). En la cartilla la remera va **negra con estampa blanca, mostrando la espalda**. La foto original no se sube porque aparece una persona.
- Estilo: negro con degradés rojo/naranja/amarillo del logo, tipografía gruesa, precios grandes, tarjetas con borde brillante.
- Para cambios chicos se edita la versión anterior pasándola como imagen de entrada. Después de varias ediciones encadenadas aparece textura granulada: si hace falta una versión limpia, generar de nuevo desde la v1 con todos los textos finales.
- Siempre revisar en la imagen que **cada precio y texto esté bien escrito** antes de entregarla.
- Al usuario hay que darle **la imagen** (link directo para abrir y guardar), no solo el archivo.

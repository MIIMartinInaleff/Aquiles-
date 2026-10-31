# Mis Cuentas · José (finanzas personales)

Plataforma aparte del gym, para los gastos personales de José. Publicada en https://aquiles-gym.vercel.app/jose/ (pide contraseña).

- Archivo único: `jose/index.html` (no usa `src/build.py`). Se ve en `aquiles-gym.vercel.app/jose/`.
- Estética "panel oscuro", inspirada en tableros de métricas como Escalafy (sin copiar su marca): fondo negro puro `#000`, estilo minimalista (avisos sin cajas de color: línea a la izquierda y "Ver →"; desglose en líneas, sin íconos), **celeste argentino `#74ACDF`** (botones, acento) y **amarillo sol `#F6B40E`** ("Cargar gasto", menú activo, avisos), letra Geist grande, menú lateral en PC y barra abajo en celular. Inicio con tarjetas (valor + variación + minigráfico) y panel "Desglose". Verde = entró (`#16A47F`), naranja = gasté (`#E5603A`), validados para daltonismo sobre fondo oscuro.
- **Contraseña:** pantalla de entrada. La contraseña **no está en el repo**: `CLAVE` (en `index.html`) es el texto "ok" cifrado con ella (PBKDF2-SHA256 310k → AES-GCM). Para cambiarla: `JOSE_PW='<nueva>' node jose/clave.js` y reemplazar la línea `const CLAVE=...`. Con `node jose/clave.js datos.json` además sale `SEMILLA` (datos cifrados para una vista previa; nunca al repo). "No pedirla de nuevo" guarda la clave derivada en `localStorage.jose_k`; Ajustes → Cerrar sesión la borra.
- **Datos:** solo en el dispositivo (`localStorage`, clave `jose_v1`), **cifrados** con la clave (`{e:1,n,c}`); si encuentra datos viejos sin cifrar, los cifra al entrar. Copia de seguridad: Ajustes → Guardar / Recuperar copia (archivo `.json`, nunca al repo).
  - `mov`: `{id, t:"g"|"i", f:"YYYY-MM-DD", m, cat, det, medio, fijo?, mp?}`
  - `fijos`: `{id, nom, cat, m, dia, hasta?:"YYYY-MM" (última cuota), nota?}` · `pagos[mes][idFijo] = idMov` · `pres[cat]` = tope mensual · `mpIgn[idPagoMP]`
  - `deudas`: `{id, nom, cat, m, nota}` = cosas sin pagar ("Ya lo pagué" las pasa a gasto de hoy).
  - Los gastos que vienen del Excel llevan `xls:1` (no tienen día real: no cuentan para "el día que más gastás").
- **Secciones:** Inicio (entró / gasté / me quedó, avisos de vencimientos y topes, proyección a fin de mes), Movimientos, Métricas (6 meses, por categoría, medio de pago, gastos hormiga, día que más gasta, subas), Gastos fijos (tildar = se anota el gasto), Calculadora (cuotas vs contado con inflación, común, cuánto sale al año, descuentos, nafta), Mercado Pago, Ajustes (nombre, topes, importar Excel, copia).
- **El gym (solo lectura):** se trae del sistema del gym con la sesión de Supabase guardada en el navegador (mismo dominio). Nunca escribe.
  - **Facturación del gym** = cobros (`cob`: `ef + tr`, por mes de `f`) → `DB.gym[mes]`.
  - **Gastos del gym** = filas `gas` (clave `AAAA-M`, mes desde 0). Si un mes no tiene filas, se usa la plantilla `cfg/gtpl`, igual que muestra el gym; si hay montos de ejemplo se marcan "estimados" → `DB.gymG[mes] = {g, est}`.
  - **Ganancia del gym** = facturación − gastos del gym = lo que le entra a José ("Entró"). Si un mes hay un ingreso manual "Gimnasio", se usa ese.
  - Inicio: tarjetas Facturación del gym / Ganancia del gym / Gasté / Me quedó; el Desglose arranca en la facturación. Métricas: tabla "El gym mes a mes".
  - Si en ese navegador no hay sesión del gym, Inicio (y Ajustes) muestran "Conectar con el gym": se pone la contraseña del sistema del gym y se inicia sesión con la misma cuenta (`signInWithPassword`, solo lectura de datos).
  - Se actualiza al abrir, al volver a la pestaña o desde Ajustes. Abierta como archivo (`file:`) no trae nada.
- **Separación:** los gastos propios del gym (EMEC) van en el sistema del gym, no en Mis Cuentas.
- **Facturar en ARCA (ex AFIP):** sección para anotar las facturas del mes (`DB.facturas`: `{id, f, m, num, a}`), compararlas con lo que cobró el gym ("falta facturar"), paso a paso para Comprobantes en línea, botón a ARCA y control del tope anual del monotributo (`DB.mono`: `{cat, tope, cuota, dia}`; la cuota se agrega sola a gastos fijos). Desde el día 15, si no hay facturas en el mes, Inicio avisa.
- **Descargar Excel:** botón en Movimientos y en Ajustes. Hojas: Resumen por mes, Movimientos, Gastos fijos, Sin pagar, Facturas ARCA (usa `lib/xlsx.full.min.js`).
- **Medios de pago:** Efectivo, Mercado Pago (personal), Banco Patagonia, Tarjeta Naranja, Débito, Crédito, Transferencia.
- **Sin Mercado Pago en vivo:** se sacó (era la cuenta del gym; José usa su Mercado Pago personal, Banco Patagonia y Tarjeta Naranja). Pendiente: importar los resúmenes de esas cuentas.
- **Importar Excel:** busca columnas fecha / detalle / monto en las primeras 15 filas y adivina la categoría por palabras (`adivinarCat`).

## Excel de José (`Gastos_Mensuales_26.xls`)
- Dos hojas: "Gasto 2026" (enero–mayo) y "Gastos Mensual 2026" (junio–diciembre). Filas = conceptos, columnas = meses; "gasto fijo" arriba y "gasto variable" abajo. Notas en la columna I.
- **Letra roja = pendiente de pago** (se lee con `xlrd` y `formatting_info=True`; SheetJS no lee colores de .xls).
- Se convirtió con un script fuera del repo a una copia `.json` (día del mes = vencimiento si se conoce, si no el 10). Lo rojo de octubre (Claro, préstamo) quedó como fijo sin tildar; tasa de higiene, inmobiliario, expensas Bs As y abogado de septiembre quedaron en `deudas`.
- Correcciones de tipeo aplicadas: Sura marzo `4613414` → $46.134,14; cuota depto julio `1265.107` → $1.265.107. Plan Jeep de abril estaba como texto (el total del Excel no lo sumaba).

## Pendientes
- Respuestas de José (30/10): SCPL = Sociedad Cooperativa Popular Limitada (servicios); EMEC = seguro de emergencias del gym (por si un socio se lastima); Mercado de la Costa = comida e insumos del mes; la transferencia a los hijos son sus sueldos (categoría "Sueldos (hijos)"); Valen sigue en la universidad (fijo); Las Golondrinas = impuestos de un terreno en la cordillera, se paga todos los meses (fijo, monto del último mes: $300.000).
- Falta saber: si los $117.030 de sueldos de septiembre están bien, si lo rojo viejo ya se pagó y si la cuota del depto de octubre se pagó.
- Sincronizar entre celular y PC (Supabase, cifrado).
- Importar los resúmenes de sus cuentas: Mercado Pago personal, Banco Patagonia y Tarjeta Naranja (a confirmar si tiene otra).
- Los datos del Excel de José no están en el sitio (repo público): la primera vez se cargan con Ajustes → Recuperar copia.

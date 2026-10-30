# Mis Cuentas · José (finanzas personales)

Plataforma aparte del gym, para los gastos personales de José. **Todavía no publicada** (no hacer push a `main` hasta que el usuario lo pida).

- Archivo único: `jose/index.html` (no usa `src/build.py`). Se vería en `aquiles-gym.vercel.app/jose/`.
- Estética "papel": fondo crema, verde petróleo, letra grande (Figtree; títulos Fraunces). Verde = entró (`#1A9C7E`), terracota = gasté (`#C2410C`), validados para daltonismo.
- **Datos:** solo en el dispositivo (`localStorage`, clave `jose_v1`). Copia de seguridad: Ajustes → Guardar / Recuperar copia (archivo `.json`, nunca al repo).
  - `mov`: `{id, t:"g"|"i", f:"YYYY-MM-DD", m, cat, det, medio, fijo?, mp?}`
  - `fijos`: `{id, nom, cat, m, dia, hasta?:"YYYY-MM" (última cuota), nota?}` · `pagos[mes][idFijo] = idMov` · `pres[cat]` = tope mensual · `mpIgn[idPagoMP]`
  - `deudas`: `{id, nom, cat, m, nota}` = cosas sin pagar ("Ya lo pagué" las pasa a gasto de hoy).
  - Los gastos que vienen del Excel llevan `xls:1` (no tienen día real: no cuentan para "el día que más gastás").
- **Secciones:** Inicio (entró / gasté / me quedó, avisos de vencimientos y topes, proyección a fin de mes), Movimientos, Métricas (6 meses, por categoría, medio de pago, gastos hormiga, día que más gasta, subas), Gastos fijos (tildar = se anota el gasto), Calculadora (cuotas vs contado con inflación, común, cuánto sale al año, descuentos, nafta), Mercado Pago, Ajustes (nombre, topes, importar Excel, copia).
- **Mercado Pago:** usa el mismo `/api/mp` del gym con la sesión de Supabase guardada en el navegador (mismo dominio). Muestra los pagos que salieron (`dir: out`) para anotarlos o descartarlos ("No" = no es gasto personal).
- **Importar Excel:** busca columnas fecha / detalle / monto en las primeras 15 filas y adivina la categoría por palabras (`adivinarCat`).

## Excel de José (`Gastos_Mensuales_26.xls`)
- Dos hojas: "Gasto 2026" (enero–mayo) y "Gastos Mensual 2026" (junio–diciembre). Filas = conceptos, columnas = meses; "gasto fijo" arriba y "gasto variable" abajo. Notas en la columna I.
- **Letra roja = pendiente de pago** (se lee con `xlrd` y `formatting_info=True`; SheetJS no lee colores de .xls).
- Se convirtió con un script fuera del repo a una copia `.json` (día del mes = vencimiento si se conoce, si no el 10). Lo rojo de octubre (Claro, préstamo) quedó como fijo sin tildar; tasa de higiene, inmobiliario, expensas Bs As y abogado de septiembre quedaron en `deudas`.
- Correcciones de tipeo aplicadas: Sura marzo `4613414` → $46.134,14; cuota depto julio `1265.107` → $1.265.107. Plan Jeep de abril estaba como texto (el total del Excel no lo sumaba).

## Pendientes
- Respuestas de José: ingresos (sueldo/jubilación/gym), qué es M. de la Costa, Las Golondrinas, SCPL y EMEC, transferencia a hijos de sept ($117.030), si lo rojo viejo (SCPL enero, EMEC gym mayo, abogada y service Jeep junio) se pagó, univ. Valen después de julio, cuota depto de octubre.
- Sincronizar entre celular y PC (Supabase, cifrado) y PIN de entrada.
- Mercado Pago propio sin depender de la sesión del gym.

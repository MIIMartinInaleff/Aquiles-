# Mis Cuentas · José (finanzas personales)

Plataforma aparte del gym, para los gastos personales de José. **Todavía no publicada** (no hacer push a `main` hasta que el usuario lo pida).

- Archivo único: `jose/index.html` (no usa `src/build.py`). Se vería en `aquiles-gym.vercel.app/jose/`.
- Estética "panel oscuro", inspirada en tableros de métricas como Escalafy (sin copiar su marca): fondo casi negro, acento violeta `#8B5CF6`, letra Geist grande, menú lateral en PC y barra abajo en celular. Inicio con tarjetas (valor + variación contra el mes anterior + minigráfico de 6 meses) y panel "Desglose" (entró → categorías → me quedó). Verde = entró (`#16A47F`), naranja = gasté (`#E5603A`), validados para daltonismo sobre fondo oscuro.
- **Datos:** solo en el dispositivo (`localStorage`, clave `jose_v1`). Copia de seguridad: Ajustes → Guardar / Recuperar copia (archivo `.json`, nunca al repo).
  - `mov`: `{id, t:"g"|"i", f:"YYYY-MM-DD", m, cat, det, medio, fijo?, mp?}`
  - `fijos`: `{id, nom, cat, m, dia, hasta?:"YYYY-MM" (última cuota), nota?}` · `pagos[mes][idFijo] = idMov` · `pres[cat]` = tope mensual · `mpIgn[idPagoMP]`
  - `deudas`: `{id, nom, cat, m, nota}` = cosas sin pagar ("Ya lo pagué" las pasa a gasto de hoy).
  - Los gastos que vienen del Excel llevan `xls:1` (no tienen día real: no cuentan para "el día que más gastás").
- **Secciones:** Inicio (entró / gasté / me quedó, avisos de vencimientos y topes, proyección a fin de mes), Movimientos, Métricas (6 meses, por categoría, medio de pago, gastos hormiga, día que más gasta, subas), Gastos fijos (tildar = se anota el gasto), Calculadora (cuotas vs contado con inflación, común, cuánto sale al año, descuentos, nafta), Mercado Pago, Ajustes (nombre, topes, importar Excel, copia).
- **Lo que entra = lo del gym:** "Entró" se llena solo sumando los cobros del gym (colección `cob`: `ef + tr`, por mes de `f`), lo mismo que Facturación. Usa la sesión de Supabase del sistema del gym guardada en el navegador (mismo dominio) y **solo lee**. Se guarda en `DB.gym[mes]` (+ `DB.gymAct`). Si ese mes hay un ingreso manual con categoría "Gimnasio", se usa el manual (no se suma dos veces). Se actualiza al abrir y al volver a la pestaña, o desde Ajustes. Abierta como archivo (`file:`) no trae nada.
- **Mercado Pago:** usa el mismo `/api/mp` del gym con la sesión de Supabase guardada en el navegador (mismo dominio). Muestra los pagos que salieron (`dir: out`) para anotarlos o descartarlos ("No" = no es gasto personal).
- **Importar Excel:** busca columnas fecha / detalle / monto en las primeras 15 filas y adivina la categoría por palabras (`adivinarCat`).

## Excel de José (`Gastos_Mensuales_26.xls`)
- Dos hojas: "Gasto 2026" (enero–mayo) y "Gastos Mensual 2026" (junio–diciembre). Filas = conceptos, columnas = meses; "gasto fijo" arriba y "gasto variable" abajo. Notas en la columna I.
- **Letra roja = pendiente de pago** (se lee con `xlrd` y `formatting_info=True`; SheetJS no lee colores de .xls).
- Se convirtió con un script fuera del repo a una copia `.json` (día del mes = vencimiento si se conoce, si no el 10). Lo rojo de octubre (Claro, préstamo) quedó como fijo sin tildar; tasa de higiene, inmobiliario, expensas Bs As y abogado de septiembre quedaron en `deudas`.
- Correcciones de tipeo aplicadas: Sura marzo `4613414` → $46.134,14; cuota depto julio `1265.107` → $1.265.107. Plan Jeep de abril estaba como texto (el total del Excel no lo sumaba).

## Pendientes
- Respuestas de José (30/10): SCPL = Sociedad Cooperativa Popular Limitada (servicios); EMEC = seguro de emergencias del gym (por si un socio se lastima); Mercado de la Costa = comida e insumos del mes; la transferencia a los hijos son sus sueldos (categoría "Sueldos (hijos)"); Valen sigue en la universidad (fijo); Las Golondrinas = impuestos de un terreno en la cordillera, se paga todos los meses (fijo, monto del último mes: $300.000).
- Falta saber: si los $117.030 de sueldos de septiembre están bien, si lo rojo viejo ya se pagó y si la cuota del depto de octubre se pagó.
- Sincronizar entre celular y PC (Supabase, cifrado) y PIN de entrada.
- Mercado Pago propio sin depender de la sesión del gym.

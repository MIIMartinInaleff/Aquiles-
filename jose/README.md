# Mis Cuentas · José (finanzas personales)

Plataforma aparte del gym, para los gastos personales de José. **Todavía no publicada** (no hacer push a `main` hasta que el usuario lo pida).

- Archivo único: `jose/index.html` (no usa `src/build.py`). Se vería en `aquiles-gym.vercel.app/jose/`.
- Estética "papel": fondo crema, verde petróleo, letra grande (Figtree; títulos Fraunces). Verde = entró (`#1A9C7E`), terracota = gasté (`#C2410C`), validados para daltonismo.
- **Datos:** solo en el dispositivo (`localStorage`, clave `jose_v1`). Copia de seguridad: Ajustes → Guardar / Recuperar copia (archivo `.json`, nunca al repo).
  - `mov`: `{id, t:"g"|"i", f:"YYYY-MM-DD", m, cat, det, medio, fijo?, mp?}`
  - `fijos`: `{id, nom, cat, m, dia}` · `pagos[mes][idFijo] = idMov` · `pres[cat]` = tope mensual · `mpIgn[idPagoMP]`
- **Secciones:** Inicio (entró / gasté / me quedó, avisos de vencimientos y topes, proyección a fin de mes), Movimientos, Métricas (6 meses, por categoría, medio de pago, gastos hormiga, día que más gasta, subas), Gastos fijos (tildar = se anota el gasto), Calculadora (cuotas vs contado con inflación, común, cuánto sale al año, descuentos, nafta), Mercado Pago, Ajustes (nombre, topes, importar Excel, copia).
- **Mercado Pago:** usa el mismo `/api/mp` del gym con la sesión de Supabase guardada en el navegador (mismo dominio). Muestra los pagos que salieron (`dir: out`) para anotarlos o descartarlos ("No" = no es gasto personal).
- **Importar Excel:** busca columnas fecha / detalle / monto en las primeras 15 filas y adivina la categoría por palabras (`adivinarCat`).

## Pendientes
- Cargar los gastos reales que mande el usuario (PDF/Excel) → generar un `.json` de copia para "Recuperar copia" (no subirlo).
- Sincronizar entre celular y PC (Supabase, cifrado) y PIN de entrada.
- Mercado Pago propio sin depender de la sesión del gym.

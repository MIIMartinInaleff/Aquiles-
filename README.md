# Aquiles World Gym · Sistema de administración

Sistema web para administrar el gimnasio: socios, check-in, cobros, transferencias, avisos por WhatsApp, facturación, gastos y ajustes.

- Todo está en `index.html` (sitio estático, no necesita instalación ni build).
- Para entrar hace falta la contraseña del gimnasio.
- **Los datos de los socios están cifrados** (AES-256-GCM) dentro de la página: sin la contraseña no se pueden leer, aunque alguien abra el archivo.
- Lo que se carga (cobros, ingresos, socios nuevos, gastos) se guarda en **Supabase** y se ve al instante en todos los dispositivos.
- La base solo acepta la cuenta del gimnasio (registro cerrado y RLS activado).

## Publicar en Vercel
Add New → Project → elegir este repositorio → Framework: **Other** → Deploy. No hace falta configurar nada más.

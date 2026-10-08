# Registro de verificación

## Migración React / TSX

Comprobaciones locales de septiembre de 2026:

- Biome, TypeScript estricto y build de producción sin errores.
- **24 pruebas unitarias aprobadas**, con 883 aserciones.
- **9 pruebas Playwright aprobadas en desarrollo**: ocho deterministas (cuatro en escritorio 1440 × 1000 y cuatro en móvil emulado 390 × 844) y una integración NASA real en escritorio.
- Las ocho pruebas deterministas también pasan contra el build de producción servido por Bun. Se añadió `bun run test:e2e:production` para repetir esta comprobación.
- Replay completo: 23 → 24 → 41 → 69 detecciones del caso reproducible; recursos, revisión de etapas, bitácora, exportación y reinicio.
- Formularios controlados y notas conservados entre vistas. Texto similar a HTML permanece como texto. Respuestas API vacías o fallidas no reemplazan el ejercicio.
- Clics, popups, zoom, centrado y montaje repetido del mapa bajo StrictMode; sin instancias duplicadas ni errores JavaScript. El aviso de tiles no disponibles no tapa la leyenda.
- Consulta auténtica FIRMS NOAA-20 SP: **83 observaciones**, área `[-123,53,-120,56]`, 2023-07-12, un día. Se contrastaron los marcadores renderizados con la respuesta validada.
- Imágenes NASA GIBS descargadas y renderizadas en el navegador. Se inspeccionaron capturas de escritorio, móvil, debrief y consulta FIRMS.
- Revisión de los cinco archivos del build: ninguno contiene el valor de `FIRMS_MAP_KEY`. La clave tampoco aparece en peticiones del navegador ni en la respuesta FIRMS. `.env` permanece ignorado por Git y no se modificó.

Las pruebas detectaron la falta del CSS de Leaflet tras retirar el código anterior. Se añadió su importación explícita en una capa CSS. La inspección visual también detectó tiles CARTO con “API Key Required”, aunque respondían HTTP 200; se retiró ese proveedor. El fondo predeterminado es NASA GIBS y “Solo detecciones” no carga imágenes remotas.

La prueba de producción detectó que `className` debía entregarse a `CircleMarker` al crearlo, no mediante `pathOptions`: el segundo montaje de StrictMode ocultaba esa diferencia en desarrollo. Los 23 puntos ya existían, pero no tenían la clase estable usada para identificarlos. Se corrigió y se repitió el recorrido completo en producción.

Para reproducir: `bun run check`, `bun run build`, `bun run test:e2e` y `bun run test:e2e:live`. Se usó `E2E_BROWSER_PATH=/usr/bin/chromium`; la variable no hace falta con Chromium instalado por Playwright. El grupo `live` necesita internet y tu clave FIRMS; no se ejecuta en CI. Capturas y reporte quedan en `test-results/` y `playwright-report/`, ignorados por Git. Una nueva ejecución puede reemplazar resultados anteriores.

## Verificación inicial

Realizada durante la implementación del 4 de septiembre de 2026, hora de Ecuador.

## Datos y servicios

- Descarga real de la muestra pública NASA FIRMS. Se validaron 74 605 filas de origen y 69 observaciones del sector seleccionado.
- El endpoint EONET, a través de la API local, devolvió 12 eventos.
- Una consulta autenticada a FIRMS con NOAA-20 SP, sector `[-123,53,-120,56]`, fecha 2023-07-12 y un día devolvió 83 observaciones.
- La consulta autenticada no reemplazó el caso Suomi NPP reproducible. Son sensores/productos distintos y sus conteos no tienen por qué coincidir.
- Se verificó que NASA GIBS respondió con una imagen del fondo Blue Marble.

No se registran credenciales en este documento ni en el control de versiones.

## Controles automatizados

`bun run check` ejecuta formato/lint, TypeScript estricto y las pruebas de integridad de datos, transiciones del replay, reservas, API y configuración. Las pruebas no usan la clave real ni requieren NASA.

`bun run build` genera el cliente de producción. Los endpoints y el servidor de archivos se verifican por HTTP local.

Se revisaron teclado, tamaños adaptables y capturas en Chromium. No se probaron Firefox, Safari ni dispositivos físicos; tampoco se ejecutó CI remoto. Estas comprobaciones no sustituyen una auditoría WCAG ni una validación de la rúbrica por personal de respuesta a emergencias.

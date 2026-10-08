# Arquitectura

La interfaz usa React 19 con componentes TypeScript `.tsx`. Vite y su plugin oficial React sirven y compilan el cliente; Bun ejecuta el servidor local, los scripts y las pruebas. Tailwind aporta utilidades y tokens de tipografía, con CSS de componentes para el mapa y la consola. La lógica que no produce UI sigue en archivos `.ts`.

## Fronteras

1. `src/domain` no depende del navegador ni de red. Mantiene el estado, los recursos y las transiciones como funciones puras.
2. `src/data/firms.ts` convierte CSV en modelos tipados. Valida primero y filtra después, conserva las unidades y deduplica por satélite, hora y coordenadas.
3. `server/nasa.ts` limita los hosts y productos, llama a NASA y devuelve datos validados sin credenciales.
4. `src/ui/*.tsx` renderiza evidencia y decisiones. React Leaflet traduce observaciones a marcadores; no dibuja un supuesto frente entre puntos.
5. `src/App.tsx` compone vistas y conecta `useReducer` con `src/domain/workspace.ts`. No contiene variables de entorno.
6. `src/lib/presentation.ts` agrupa etiquetas, selección de coordenadas EONET y exportación JSON sin JSX.

Las decisiones no modifican el dataset. Una transición crea una sesión nueva y agrega una entrada a la bitácora; el índice esperado impide confirmar dos veces o modificar una etapa pasada.

## Ciclo de vida React

Los controles son declarativos: selección, razonamiento y etapa viven en el reductor y se conservan al abrir las fuentes. La búsqueda FIRMS y el catálogo tienen estados de carga independientes. Las solicitudes se cancelan al desmontar su pantalla y las consultas vacías o fallidas no reemplazan el ejercicio.

La entrada usa `StrictMode` para detectar efectos sin limpieza. `MapContainer` es dueño del mapa Leaflet; React Leaflet crea y elimina capas, eventos y popups. El observador de tamaño se desconecta al desmontar. Los datos externos y notas se renderizan como texto JSX, sin `innerHTML` ni plantillas HTML. Solo la atribución estática de los proveedores utiliza el formato HTML que requiere Leaflet.

La hoja de estilos de Leaflet se importa explícitamente en una capa CSS después de Tailwind; es necesaria para posicionar tiles, controles y marcadores. Los marcadores SVG permiten verificar geometría, clics y recuentos reales con Playwright.

## Variables de entorno y alias

`config.ts` es la única frontera de lectura de `process.env`. Exporta un esquema verificable y un objeto inmutable. Los puertos tienen defaults; el secreto de FIRMS no. Un secreto ausente bloquea su operación específica con HTTP 428, sin impedir usar datos públicos que no requieren autenticación.

Los imports internos utilizan `@/`, `@server/` y `@config`. Se resuelven con TypeScript y Bun. El cargador nativo de Vite conserva esa resolución en el propio archivo de configuración. El cliente solo tiene acceso al alias `@/`.

## HTTP local

- `GET /api/health` informa disponibilidad y presencia de clave, nunca su valor.
- `GET /api/events` obtiene hasta 12 eventos de EONET.
- `POST /api/firms` acepta un cuerpo validado con `bbox`, `source`, `date` y `days`.
- `bun start` sirve además los archivos del build.

El servidor escucha en `127.0.0.1`. Comprueba origen y host de las llamadas API, limita cuerpos, responde con errores sin URL con credenciales y rechaza fuentes fuera de la lista permitida. La caché de consultas dura diez minutos, tiene un máximo de veinte entradas y reutiliza solicitudes en curso. FIRMS admite hasta seis consultas por minuto en este servidor local.

El proxy Vite permite que el cliente use rutas del mismo origen. La clave no aparece en consultas del navegador, respuestas ni almacenamiento local. La API de NASA exige la clave en su URL de origen; esa URL se construye únicamente en el servidor y no se registra.

Esto es una configuración de desarrollo local. Publicar la API requeriría decisiones explícitas sobre autenticación, cuota por usuario, secretos y despliegue. No se abre el servidor a la red ni se publica un sitio.

## Decisiones y límites

Leaflet maneja zoom, capas y coordenadas. Los tiles tienen atribución y necesitan conectividad. Una falla de tiles no elimina las observaciones.

El estado no persiste entre recargas. La exportación del debrief permite conservar la sesión de forma explícita. No se almacenan claves en el cliente.

El dataset inicial es pequeño y verificable. Los resultados API se limitan a 15 000 observaciones; la respuesta de origen tiene un tope de 20 MiB. El código no intenta inferir propagación, daño ni población a partir del número de detecciones.

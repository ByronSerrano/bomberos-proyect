# bomberos-proyect

Laboratorio local de decisiones construido con **Bun, React, Vite, TypeScript y Tailwind CSS**. Revela observaciones reales de NASA por etapas, permite asignar recursos de un ejercicio y entrega un debrief con evidencia y una rúbrica explícita.

El proyecto distingue tres cosas: observaciones satelitales, contexto cartográfico y decisiones didácticas. No calcula víctimas evitadas, perímetros, propagación ni eficacia real de una respuesta.

## Empezar

Requisito: Bun 1.4.1 o posterior. No se necesita Node, npm ni una cuenta de NASA para el caso incluido.

```sh
cd ~/workspace/dev/personal/bomberos/bomberos-proyect
bun install --frozen-lockfile
bun dev
```

Abre [http://127.0.0.1:5173](http://127.0.0.1:5173). `bun dev` inicia Vite y el servidor Bun; Ctrl+C termina ambos. Se escuchan conexiones únicamente en la interfaz local.

El caso reproducible viene incluido. Los fondos cartográficos, EONET y las consultas nuevas a FIRMS necesitan internet. Una vez descargadas las dependencias, puedes ejecutar el ejercicio incluido sin conexión, con los puntos sobre la cuadrícula si no se carga el mapa base.

## Datos reales

- **NASA FIRMS, caso reproducible.** 69 detecciones VIIRS Suomi NPP, extraídas de la muestra oficial del 12 de julio de 2023. Sector `[-123, 53, -120, 56]`, en Columbia Británica. Adquisiciones a las 09:58, 10:00, 11:40 y 19:49 UTC. La selección espacial no identifica un único incendio.
- **NASA FIRMS Area API.** Consultas por área, fecha y producto VIIRS, hasta cinco días. Las solicitudes pasan por Bun y requieren tu MAP_KEY.
- **NASA EONET v3.** Catálogo de eventos reales que ayuda a preparar el área de una consulta. No se atribuyen automáticamente detecciones FIRMS a un evento EONET.
- **NASA GIBS Blue Marble.** Fondo estático predeterminado, sin clave adicional. No representa una imagen del incendio de la fecha elegida. La opción “Solo detecciones” prescinde del fondo y funciona sin conexión.

La procedencia, fecha de descarga, SHA-256 del CSV original y los conteos de validación aparecen en la sección “Fuentes y datos”.

Para reproducir la descarga:

```sh
bun run data:sync
```

El comando obtiene el [CSV oficial de NASA](https://firms.modaps.eosdis.nasa.gov/content/notebooks/sample_viirs_snpp_071223.csv), valida los registros, filtra el sector y reemplaza el snapshot solo después de obtener un resultado válido. Las coordenadas, horas, FRP y niveles de confianza proceden del archivo. No hay un generador de detecciones.

## Configuración

Toda lectura de variables de entorno vive en `config.ts`. Zod valida tipos y rangos, recorta espacios de la clave y elimina propiedades no declaradas con `.strip()`. El objeto resultante se congela.

| Variable | Comportamiento |
| --- | --- |
| `API_PORT` | 8787 si no está definida |
| `WEB_PORT` | 5173 si no está definida |
| `FIRMS_MAP_KEY` | Sin fallback. Una cadena vacía se considera ausente |
| `E2E_BROWSER_PATH` | Opcional, ruta al Chromium local para Playwright. Sin definir usa el navegador instalado por Playwright |
| `E2E_TARGET` | `development` por defecto; `production` ejecuta Playwright contra el build servido por Bun |

Para configurar FIRMS, copia `.env.example` a `.env` **solo si no tienes uno** y pega allí tu [MAP_KEY gratuita de NASA](https://firms.modaps.eosdis.nasa.gov/api/). Si ya tienes `.env`, edítalo conservando sus valores.

```dotenv
FIRMS_MAP_KEY=tu_clave_de_nasa
API_PORT=8787
WEB_PORT=5173
```

Reinicia `bun dev` después de cambiar la configuración. La clave es opcional para arrancar el caso local, pero obligatoria para consultar FIRMS. No existe una clave compartida, de ejemplo ni un fallback de autenticación. No uses el prefijo `VITE_` en secretos. No importes `@config` desde el navegador.

Bun carga `.env` antes de evaluar la configuración. Vite se ejecuta con `--configLoader native` para que Bun resuelva también los alias del archivo de configuración. No hay una segunda lectura con `loadEnv`.

## Estructura

```text
config.ts              Variables de entorno, validación y valores por defecto
src/
  main.tsx             Entrada React con StrictMode
  App.tsx              Composición de pantallas y carga inicial
  domain/              Modelos, etapas, recursos y estado del replay
  data/                Parser FIRMS y cliente HTTP
  ui/*.tsx             Componentes React, formulario y mapa React Leaflet
  lib/                 Utilidades TypeScript sin JSX
  style.css            Tailwind, tema y estilos de componentes
server/
  app.ts               Rutas HTTP, límites de acceso y respuestas
  nasa.ts              Adaptadores NASA, timeout, caché y validación
  index.ts             Servidor local Bun
scripts/
  dev.ts               Ciclo de vida de Vite y API
  sync-sample.ts        Descarga reproducible del dataset
public/data/           Snapshot real con procedencia
tests/                 Integridad de datos, replay, configuración y API
e2e/                   Playwright: escritorio, móvil y servicios NASA reales
docs/                  Decisiones de arquitectura y metodología
```

Se usan alias en todos los imports internos:

```ts
import { loadSample } from '@/data/client';
import { createHandler } from '@server/app';
import { config } from '@config';
```

`@/*` apunta a `src/*`, `@server/*` a `server/*` y `@config` a `config.ts`. TypeScript y Bun leen el mapa de `tsconfig.json`; Vite resuelve `@/` para el cliente. Los otros dos alias son exclusivos del servidor y sus herramientas.

Los componentes de UI usan `.tsx`; los modelos, reductores, clientes, utilidades y servidor siguen en `.ts`. El compilador usa `jsx: react-jsx` y Vite incorpora el plugin oficial de React para Fast Refresh. No se generan vistas con cadenas HTML.

## Calidad y ejecución

```sh
bun run check          # Biome, TypeScript estricto y pruebas
bun run build          # Validación de tipos y build de Vite
bun start              # App compilada y API en http://127.0.0.1:8787
bun run format         # Formato y correcciones seguras de Biome
```

`bun run preview` sirve únicamente el frontend compilado en el puerto 4173. Para comprobar las integraciones del build usa `bun start`.

Las pruebas unitarias cubren tiempos UTC, filas inválidas, deduplicación, límites de consulta, bloqueo de información futura, reservas, liberación de recursos, todos los caminos de decisión válidos, protección de la clave y validación de configuración. No llaman servicios externos.

### Pruebas de navegador

```sh
bun --bun playwright install chromium   # Solo la primera vez
bun run test:e2e                        # Chromium: escritorio y móvil, sin llamadas a NASA
bun run test:e2e:live                   # FIRMS autenticado y tiles NASA GIBS reales
bun run test:e2e:production             # Compila y repite las ocho pruebas sobre bun start
```

Si ya tienes Chromium instalado, puedes evitar descargar otro navegador:

```sh
E2E_BROWSER_PATH=/usr/bin/chromium bun run test:e2e
E2E_BROWSER_PATH=/usr/bin/chromium bun run test:e2e:live
```

Playwright inicia `bun dev` si es necesario; también puede reutilizar una instancia en el puerto configurado. Las pruebas deterministas usan el snapshot NASA incluido y bloquean los fondos externos para comprobar la degradación sin conexión. Cubren controles, popup, zoom, montaje repetido del mapa, decisiones, errores, exportación y anchos de 1440 y 390 px.

Para `test:e2e:production`, detén primero `bun dev`: ambos servidores usan el puerto de la API. Playwright inicia `bun start` y cierra el servidor que haya creado cuando termina la prueba.

La prueba `live` necesita internet y `FIRMS_MAP_KEY`. Hace una consulta NOAA-20 SP del 12 de julio de 2023 y comprueba que las imágenes geográficas se descargan y que el número de puntos renderizados coincide con la respuesta real. Consume cuota FIRMS y no forma parte del CI. Los reportes y capturas quedan en `playwright-report/` y `test-results/`, ignorados por Git.

Biome comprueba formato, reglas React y accesibilidad estática. Se mantiene una sola herramienta de lint/formato; no se duplican sus responsabilidades con ESLint o Prettier. Playwright prueba el comportamiento en navegador y no sustituye la revisión de tipos.

El flujo de CI usa Bun y el lockfile para ejecutar los mismos controles. La configuración del flujo está incluida; no se ha publicado un repositorio ni ejecutado CI remoto desde este entorno.

## Reglas del ejercicio

Cada etapa termina en una hora de adquisición real. Si una consulta contiene más horas, se agrupan en un máximo de cuatro etapas sin inventar tiempos intermedios. Las etapas futuras permanecen bloqueadas en la interfaz. Puedes revisar etapas anteriores sin reescribir sus decisiones.

Una asignación reserva recursos durante un número de etapas. Una acción no disponible no se puede confirmar. La evidencia de NASA nunca cambia por una decisión. El debrief compara el razonamiento con una rúbrica didáctica, muestra los conteos observados y permite exportar el registro como JSON.

La fuente aporta hora de adquisición, no hora exacta de publicación. Esta versión **no reconstruye qué información estaba disponible para un operador en un instante histórico**. Tampoco incluye viento, lluvia, población expuesta, rutas verificadas ni reportes de campo.

Las posiciones se distribuyen al cliente con el snapshot completo: bloquear etapas es una mecánica pedagógica, no una defensa contra inspección del archivo. El estado del ejercicio vive en memoria y se reinicia al recargar la página. La única excepción es la marca `disaster-replay:briefing-seen` en localStorage, que recuerda si ya viste el diálogo de cómo funciona. No guarda decisiones, notas ni recursos.

## Documentación

- [Arquitectura](docs/architecture.md)
- [Fuentes y metodología](docs/data-sources.md)
- [Registro de verificación](docs/verification.md)
- [Plan de migración a React/TSX](docs/react-migration.md)

Agradecimiento a NASA FIRMS, parte de NASA ESDIS, por los datos de detecciones térmicas. Este proyecto es independiente y no está avalado por NASA. La evaluación del ejercicio no es un protocolo validado para dirigir emergencias reales.

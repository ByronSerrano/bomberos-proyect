# Fuentes y metodología

## Caso reproducible

Fuente: [NASA FIRMS Fire Data Academy, ingestión de datos](https://firms.modaps.eosdis.nasa.gov/content/academy/data_ingest/firms_data_ingest.html).

CSV: [sample_viirs_snpp_071223.csv](https://firms.modaps.eosdis.nasa.gov/content/notebooks/sample_viirs_snpp_071223.csv).

NASA describe el archivo como una muestra mundial VIIRS Suomi NPP del 12 de julio de 2023. Contiene registros de procesamiento NRT y URT. El proyecto no sustituye ese contenido por ejemplos inventados.

Procedimiento reproducible en `bun run data:sync`:

1. Descargar el CSV y calcular su SHA-256.
2. Validar coordenadas, hora UTC, FRP, confianza, tamaño de huella y metadatos.
3. Conservar longitud entre -123 y -120 y latitud entre 53 y 56, incluyendo los límites.
4. Deduplicar combinaciones de satélite, adquisición y coordenadas. Si existen copias NRT y URT, preferir NRT.
5. Ordenar por adquisición y guardar el resultado con su procedencia.

La fuente verificada tiene 74 605 filas. El sector inicial contiene 69 observaciones válidas, sin duplicados eliminados en ese sector.

| Adquisición UTC | Detecciones nuevas | Acumuladas |
| --- | ---: | ---: |
| 09:58 | 23 | 23 |
| 10:00 | 1 | 24 |
| 11:40 | 17 | 41 |
| 19:49 | 28 | 69 |

Cada detección conserva `scan` y `track` en km, `frp` en MW, confianza `l/n/h`, fecha, hora, satélite, versión y condición día/noche. El popup del mapa muestra estos atributos. El tamaño del marcador depende de FRP para facilitar la lectura; **no representa un área quemada**.

## Otras consultas

[Area API de FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/) usa límites oeste, sur, este, norte. Se admiten NOAA-20 NRT, NOAA-21 NRT, NOAA-20 SP y Suomi NPP SP, hasta cinco días por solicitud. Las fuentes y ventanas disponibles deben consultarse en [data availability](https://firms.modaps.eosdis.nasa.gov/api/data_availability/).

La clave es gratuita y se configura localmente. No se distribuye con el proyecto. Cada resultado conserva un hash de la respuesta original y la fecha de consulta. Para evitar revelar la clave, la URL de procedencia de estas consultas apunta a la documentación del endpoint. Producto, área y fecha quedan registrados en el dataset.

[EONET v3](https://eonet.gsfc.nasa.gov/docs/v3) aporta metadatos y geometrías de eventos. No tiene la misma semántica que las detecciones FIRMS. Seleccionar un evento únicamente prepara una consulta espacial.

[GIBS](https://nasa-gibs.github.io/gibs-api-docs/) proporciona Blue Marble Shaded Relief and Bathymetry. Es un fondo estático. No se usa una imagen diaria posterior al instante del ejercicio como si fuera una observación disponible en ese instante.

## Limitaciones interpretativas

Consulta las [preguntas frecuentes de FIRMS](https://www.earthdata.nasa.gov/data/tools/firms/faq).

- Una detección térmica no define un incendio completo ni su perímetro.
- Reobservar una ubicación no significa que haya un incendio adicional.
- Ausencia de detección no confirma ausencia de actividad.
- Diferentes adquisiciones, satélites, resoluciones y niveles de confianza afectan los conteos.
- La FRP no determina por sí sola una prioridad táctica.
- La hora de adquisición no es la hora de publicación.
- El sector inicial puede incluir actividad de varios incendios o de otras fuentes de anomalías térmicas.

El ejercicio no produce decisiones de despacho, evacuación ni combate para uso real. Su objeto es practicar interpretación de evidencia, reconocer información faltante y documentar decisiones.


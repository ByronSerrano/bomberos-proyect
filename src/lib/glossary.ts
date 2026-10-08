export const glossary = {
  viirs: {
    title: 'VIIRS',
    body: 'Sensor de los satélites Suomi NPP, NOAA-20 y NOAA-21. Detecta anomalías térmicas, no el perímetro de un incendio.',
  },
  frp: {
    title: 'FRP',
    body: 'Fire Radiative Power. Potencia radiativa del píxel, en megavatios. No mide el área quemada.',
  },
  mw: {
    title: 'MW',
    body: 'Megavatio. Unidad en la que FIRMS informa la FRP.',
  },
  confianza: {
    title: 'Confianza',
    body: 'Clasificación de la detección: baja, nominal o alta. Una confianza alta no confirma un incendio en terreno.',
  },
  huella: {
    title: 'Huella',
    body: 'Tamaño del píxel del sensor, en kilómetros de barrido por seguimiento. No es la superficie del incendio.',
  },
  utc: {
    title: 'UTC',
    body: 'Tiempo universal coordinado. La hora del ejercicio es la de adquisición del satélite, no la de publicación.',
  },
  nrt: {
    title: 'NRT',
    body: 'Near Real-Time. Producto reciente de FIRMS. Puede corregirse después en el archivo estándar.',
  },
  sp: {
    title: 'SP',
    body: 'Standard Processing. Archivo de procesamiento estándar, más estable que el producto reciente.',
  },
  urt: {
    title: 'URT',
    body: 'Ultra Real-Time. Procesamiento aún más inmediato que NRT, con la misma naturaleza preliminar.',
  },
  eonet: {
    title: 'EONET',
    body: 'Catálogo de eventos naturales de NASA. Sirve para elegir un sector. No asigna los puntos FIRMS a un incendio.',
  },
  gibs: {
    title: 'GIBS',
    body: 'Servicio de imágenes de NASA. Blue Marble es un fondo fijo, no una foto del incendio en esa fecha.',
  },
} as const;
export type GlossaryId = keyof typeof glossary;

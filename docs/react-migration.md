# Migración de UI a TSX

Estado: implementada. Resultados y límites de las pruebas en [Registro de verificación](verification.md).

## Plan

1. Añadir React, React DOM, el plugin oficial de Vite, React Leaflet y sus tipos. Configurar JSX sin alterar los alias ni la lectura centralizada de entorno.
2. Reemplazar plantillas HTML y manipulación de DOM por componentes TSX: aplicación, navegación, sala de mando, mapa, decisiones, fuentes y debrief. Mantener modelos, parser, API, configuración, estado y utilidades sin JSX en TS.
3. Usar estado declarativo, formularios controlados y efectos con cancelación/limpieza. Verificar montaje, desmontaje y remontaje del mapa bajo StrictMode.
4. Conservar Biome para formato/lint. Añadir pruebas Playwright en escritorio y móvil, más un grupo explícito de integración real para FIRMS y mapas remotos. Conservar las pruebas unitarias existentes.
5. Compilar producción, actualizar documentación y comprobar que la clave no llega al navegador.

## Criterios de aceptación

- Toda UI con JSX vive en TSX. No hay plantillas de pantalla con innerHTML ni dangerouslySetInnerHTML.
- Datos, reglas, scripts y servidor permanecen en TS y conservan imports con alias.
- El replay mantiene bloqueo temporal, decisiones, reservas, historial y exportación.
- El mapa dibuja las detecciones esperadas, permite zoom, popup, cambio de capa y retorno desde otras vistas sin duplicarse.
- Una consulta auténtica a FIRMS produce un nuevo dataset que se representa en el mapa; un error conserva la sesión anterior.
- Build, tipos, lint, pruebas unitarias y pruebas de navegador pasan, con resultados documentados.

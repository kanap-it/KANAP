# Interfaces

Las Interfaces documentan los flujos lógicos de datos entre sus aplicaciones. A diferencia de las conexiones de código directas, una Interfaz representa una integración de negocio -- el "por qué" y "qué" del intercambio de datos -- independiente de la implementación técnica. Cada Interfaz puede tener múltiples enlaces específicos de entorno que definen los endpoints y configuraciones reales.

## Primeros pasos

Navegue a **Panorama IT > Interfaces** para ver su registro de integraciones. Haga clic en **Añadir interfaz** para crear su primera entrada.

**Campos obligatorios**:

- **ID de interfaz**: Un identificador único (p. ej., `INT-CRM-ERP-001`)
- **Nombre**: Un nombre descriptivo para la integración
- **Propósito de negocio**: Por qué existe esta integración
- **Aplicación de origen**: Donde se originan los datos
- **Aplicación de destino**: Hacia donde fluyen los datos
- **Categoría de datos**: El tipo de datos que se transfieren

**Muy recomendados**:

- **Proceso de negocio**: Qué proceso de negocio soporta esta interfaz
- **Ciclo de vida**: Estado actual (Activo, Obsoleto, etc.)

**Consejo**: Comience documentando sus interfaces de producción. Utilice la pestaña Enlaces y conexiones para añadir enlaces específicos de entorno una vez definida la interfaz lógica.

---

## Trabajar con la lista

La cuadrícula de Interfaces muestra su registro de integraciones de un vistazo.

**Columnas predeterminadas**:

- **ID de interfaz**: El identificador único (haga clic para abrir el espacio de trabajo)
- **Nombre**: Nombre de la interfaz (haga clic para abrir el espacio de trabajo)
- **Entornos**: Chips coloreados que muestran qué entornos tienen enlaces configurados (p. ej., PROD, QA, DEV)
- **App de origen**: La aplicación de origen
- **App de destino**: La aplicación de destino
- **Ciclo de vida**: Estado actual
- **Criticidad**: Importancia para el negocio
- **Creado**: Cuándo se creó el registro

**Columnas adicionales** (mediante el selector de columnas):

- **Proceso de negocio**: Proceso de negocio vinculado
- **Categoría de datos**: Tipo de datos que se transfieren
- **Contiene PII**: Si la interfaz maneja datos personales
- **Cobertura de entornos**: Número de entornos con enlaces
- **Enlaces**: Número total de enlaces de entorno

**Filtrado**:

- Búsqueda rápida: Busca en todas las columnas de texto
- Filtros de columna: Filtrar por ciclo de vida, criticidad, categoría de datos, proceso de negocio, contiene PII y más

**Acciones**:

- **Añadir interfaz**: Crear una nueva interfaz (requiere `applications:manager`)
- **Duplicar interfaz**: Crear una copia de una interfaz seleccionada (requiere `applications:manager`). Seleccione exactamente una fila para habilitar esta acción. Un diálogo le permite elegir si copiar los enlaces de entorno -- consulte [Copiar interfaces](#copiar-interfaces) más abajo.
- **Eliminar seleccionadas**: Eliminar interfaces seleccionadas (requiere `applications:admin`). Una opción de casilla le permite también eliminar los enlaces relacionados; si no se marca, las interfaces con enlaces no se eliminarán.

---

## El espacio de trabajo de Interfaces

Haga clic en cualquier fila para abrir el espacio de trabajo. Tiene seis pestañas.

### Visión general

La pestaña Visión general captura la identidad y contexto de negocio de la interfaz.

**Qué puede editar**:

- **ID de interfaz**: Identificador único
- **Nombre**: Nombre visible
- **Proceso de negocio**: Vínculo a un proceso de negocio de los datos maestros
- **Propósito de negocio**: Descripción de texto libre de por qué existe esta integración
- **Aplicación de origen** / **Aplicación de destino**: Las aplicaciones conectadas
- **Categoría de datos**: El tipo de datos que se transfieren
- **Tipo de ruta de integración**: Directa o Vía middleware
- **Aplicaciones middleware**: Si el tipo de ruta es Vía middleware, seleccione las plataformas de middleware involucradas (solo aparecen aplicaciones marcadas como ETL/middleware)
- **Ciclo de vida**: Estado actual
- **Notas de visión general**: Contexto adicional o resumen

**Consejo**: La Categoría de datos y el Tipo de ruta de integración determinan lo que está disponible en las pestañas posteriores. Establézcalos temprano.

---

### Propiedad y criticidad

Esta pestaña documenta quién es responsable de la interfaz y su importancia.

**Responsables de negocio**: Partes interesadas del negocio responsables de la integración. Cada fila muestra el usuario, su apellido, nombre y puesto de trabajo (solo lectura, extraído del registro de usuario). Añada o elimine filas según sea necesario.

**Responsables IT**: Miembros del equipo técnico responsables del mantenimiento. Mismo diseño que los responsables de negocio.

**Criticidad e impacto**:

- **Criticidad**: Crítica para el negocio, Alta, Media o Baja
- **Impacto de fallo**: Descripción de texto libre de lo que sucede si esta interfaz se cae

**Empresas impactadas**: Qué empresas o entidades legales se ven afectadas por esta interfaz. Seleccione de sus datos maestros.

---

### Definición funcional

La pestaña Definición funcional captura la lógica de negocio de la integración.

**Qué puede documentar**:

- **Objetos de negocio**: Qué entidades de datos se transfieren (texto libre)
- **Casos de uso principales**: Escenarios principales que soporta esta interfaz
- **Reglas funcionales**: Reglas de negocio de alto nivel que gobiernan el flujo de datos
- **Identificadores clave**: Mapeos de identificadores de origen y destino. Cada fila mapea un identificador de origen a un identificador de destino, con notas opcionales. Utilice esto para documentar las relaciones de ID entre sistemas (p. ej., Número de material SAP se mapea a ID de producto CRM).
- **Dependencias**: Interfaces upstream y downstream de las que depende este flujo. Seleccione otras interfaces de su registro.
- **Enlaces de documentación funcional**: Añada URLs a documentación externa (Confluence, SharePoint, etc.)
- **Adjuntos funcionales**: Suba documentos de especificación directamente

---

### Definición técnica

La pestaña Definición técnica define cómo funciona la integración a nivel técnico.

**Plantilla de rutas**: Una tabla que define las rutas del flujo de datos (Extraer, Transformar, Cargar o Directo). Cada ruta especifica:

- **Tipo de ruta**: EXTRACT, TRANSFORM, LOAD o DIRECT
- **Desde / Hacia**: Qué rol maneja cada paso (App de origen, App de destino o Middleware)
- **Tipo de disparador**: Qué inicia esta ruta (p. ej., programado, basado en eventos, manual)
- **Patrón**: El patrón de integración (p. ej., lote, tiempo real, pub/sub)
- **Formato**: El formato de datos (p. ej., JSON, XML, CSV, archivo plano)
- **Nombre del trabajo**: Un nombre opcional de trabajo o proceso

Las rutas son plantillas compartidas entre todos los entornos. Los endpoints y credenciales reales van en la pestaña Enlaces y conexiones.

**Campos adicionales**:

- **Transformaciones principales (resumen)**: Cómo se transforman los datos entre origen y destino
- **Manejo de errores (resumen)**: Cómo se gestionan y escalan los errores

**Documentación**:

- **Enlaces de documentación técnica**: Añada URLs a especificaciones técnicas
- **Adjuntos técnicos**: Suba documentos técnicos

**Consejo**: Si no aparecen rutas, asegúrese de haber seleccionado aplicaciones de origen y destino y un tipo de ruta de integración en la pestaña Visión general. Las rutas se generan automáticamente a partir del tipo de ruta.

---

### Enlaces y conexiones

Esta pestaña gestiona los enlaces específicos de entorno. Presenta una matriz de entornos y rutas, permitiéndole configurar cada combinación de forma independiente.

**Cómo funciona**:

- Cada entorno (Prod, Pre-prod, QA, Test, Dev, Sandbox o personalizado) puede tener enlaces para cada ruta
- Los entornos se descubren automáticamente desde sus instancias de aplicación, o puede añadir entornos personalizados
- Haga clic en una celda vacía para crear un enlace, o haga clic en uno existente para editarlo

**Campos del enlace**:

- **Instancia de origen** / **Instancia de destino**: Qué instancias de aplicación usar en este entorno
- **Estado**: Habilitado, Deshabilitado o En pruebas
- **Endpoint de origen** / **Endpoint de destino**: Endpoints técnicos (URLs, rutas, nombres de cola, etc.)
- **Detalles del disparador**: Configuración de disparador específica del entorno
- **Nombre del trabajo del entorno**: Sobrescritura del nombre del trabajo de la plantilla para este entorno
- **Modo de autenticación**: Cómo se autentica el enlace
- **URL de monitorización**: Enlace a la monitorización u observabilidad de este enlace
- **Aplicación de herramienta de integración**: Si aplica, la herramienta de integración utilizada
- **Notas del entorno**: Notas específicas del entorno

**Vinculación con conexiones**: Cada enlace puede vincularse a conexiones de infraestructura de su registro de conexiones. Esto le permite trazar la ruta completa desde la interfaz lógica hasta las conexiones de red físicas.

---

### Datos y conformidad

La pestaña Datos y conformidad captura información de protección de datos y seguridad.

**Qué puede editar**:

- **Clasificación de datos**: Nivel de sensibilidad (Público, Interno, Confidencial, Restringido)
- **Contiene PII**: Si se transfieren datos personales. Cuando se marca, aparece un campo **Descripción PII** para detallar qué PII se incluye.
- **Datos típicos**: Descripción de una carga de datos típica
- **Auditoría y registro**: Cómo se audita la interfaz
- **Controles de seguridad (resumen)**: Medidas de seguridad implementadas
- **Residencia de datos**: Códigos de país ISO de 2 letras separados por comas donde fluyen los datos (p. ej., FR, DE, US)

---

## Copiar interfaces

Hay dos formas de copiar interfaces en KANAP:

### Duplicar interfaz (desde la página de Interfaces)

Utilice esto cuando desee crear una copia independiente de una interfaz -- típicamente para crear una interfaz similar entre las mismas o diferentes aplicaciones.

1. Seleccione una interfaz en la cuadrícula
2. Haga clic en **Duplicar interfaz**
3. Elija si copiar los enlaces de entorno:
   - **Sin enlaces**: Crea una copia limpia -- solo la definición de interfaz, rutas, responsables y metadatos
   - **Con enlaces**: También copia los enlaces de entorno, pero borra los detalles específicos del entorno (endpoints, autenticación, nombres de trabajo) para que pueda configurarlos de nuevo

**Qué se copia**:

| Datos | Se copia |
|-------|----------|
| Definición de interfaz (nombre, apps, tipo de ruta) | Sí |
| Rutas (extraer/transformar/cargar/directo) | Sí |
| Aplicaciones middleware | Sí |
| Responsables (negocio e IT) | Sí |
| Empresas impactadas | Sí |
| Dependencias | Sí |
| Identificadores clave | Sí |
| Enlaces (documentación) | Sí |
| Residencia de datos | Sí |
| Enlaces de entorno | Opcional |
| Adjuntos | No |

**Nomenclatura**: La copia obtiene " - copy" añadido tanto al nombre como al ID de interfaz.

### Migración de versiones (desde el versionado de Aplicaciones)

Utilice esto al actualizar una aplicación a una nueva versión y necesitar migrar interfaces a la nueva versión. Consulte [Aplicaciones > Gestión de versiones](applications.md#gestion-de-versiones) para más detalles.

**Diferencias clave con Duplicar**:

| Aspecto | Duplicar | Migración de versión |
|---------|----------|----------------------|
| Propósito | Crear copia independiente | Migrar a nueva versión de app |
| Referencias de app | Sin cambios | Actualizadas a nueva versión |
| Referencias de middleware | Sin cambios | Actualizadas si la app es middleware |
| Dependencias* | Copiadas | No copiadas |
| Enlaces | Opcional (instancias sin cambios) | Opcional (instancias mapeadas a nueva app) |
| Ciclo de vida | Preservado | Restablecido a Propuesto |
| Sufijo del nombre | " - copy" | " (new version)" |

*Las dependencias son relaciones upstream/downstream de interfaces (p. ej., "La sincronización de pedidos debe ejecutarse antes de la sincronización de facturas").

---

## Consejos

- **Documente primero el "por qué"**: Céntrese en el propósito de negocio antes de los detalles técnicos. Las especificaciones técnicas pueden venir después.
- **Use enlaces de entorno**: No cree interfaces separadas para cada entorno -- use una interfaz con múltiples enlaces.
- **Vincule a procesos de negocio**: Conectar interfaces a procesos de negocio ayuda con el análisis de impacto.
- **Mantenga el middleware explícito**: Si los datos fluyen a través de middleware, modélelo explícitamente con el tipo de ruta Vía middleware para ver la ruta real de los datos.
- **Use duplicar para interfaces similares**: Al crear una nueva interfaz similar a una existente, utilice **Duplicar interfaz** para copiar toda la configuración, luego modifique lo que sea diferente. Opcionalmente incluya enlaces para obtener una ventaja en la configuración del entorno.
- **Registre IDs entre sistemas**: Utilice Identificadores clave en la pestaña Definición funcional para mapear cómo se identifican los registros en los sistemas de origen y destino.

# Base de conocimiento

La Base de conocimiento es el espacio de trabajo de documentos de KANAP para políticas, procedimientos, notas técnicas, material de referencia y la documentación que necesita mantenerse conectada al trabajo real. Combina la escritura de forma libre con funcionalidades de gobernanza como plantillas, propiedad, revisión, historial de versiones y relaciones con aplicaciones, activos, proyectos, solicitudes y tareas.

A diferencia de un sistema de archivos compartido, la Base de conocimiento no es solo un lugar para almacenar documentos. La decisión de diseño importante es que cada artículo puede clasificarse, revisarse, versionarse, exportarse y vincularse a objetos operativos en toda la plataforma. Esto hace que el artículo sea más fácil de encontrar y le da contexto cuando las personas lo abren desde otro espacio de trabajo.

## Dónde encontrarla

- Espacio de trabajo: **Base de conocimiento**
- Permisos:
  - `knowledge:reader` le permite abrir y leer documentos
  - `knowledge:member` le permite crear, editar, comentar, organizar carpetas y gestionar metadatos de documentos
  - `knowledge:admin` añade administración de bibliotecas y movimientos entre bibliotecas

Si puede leer un documento pero no editarlo, el espacio de trabajo permanece disponible en modo de solo lectura.

## Cómo está organizada la Base de conocimiento

La Base de conocimiento se construye alrededor de cuatro capas de organización: bibliotecas, carpetas, tipos de documento y relaciones.

### Bibliotecas

Las bibliotecas son los contenedores de nivel más alto. Separan poblaciones de documentos que deben gestionarse de forma diferente.

Patrones típicos:
- Utilice una biblioteca regular para la base de conocimiento de trabajo de su equipo.
- Utilice la biblioteca de **Plantillas** para iniciadores de documentos reutilizables.
- Utilice la biblioteca de **Documentos gestionados** para documentos que se originan en otro espacio de trabajo y permanecen parcialmente controlados allí.

Consecuencias de la elección de biblioteca:
- La biblioteca activa determina qué árbol de carpetas ve y dónde se crean los nuevos documentos en blanco.
- En una biblioteca normal, los documentos se comportan como artículos de conocimiento estándar.
- En **Plantillas**, los documentos publicados se convierten en puntos de partida reutilizables para nuevos artículos y se agrupan por tipo de documento en el selector de plantillas.
- En **Documentos gestionados**, los artículos aún pueden ser legibles y editables, pero algunos metadatos están controlados por el espacio de trabajo de origen en lugar de desde la Base de conocimiento.

La administración de bibliotecas es intencionalmente más estricta que la edición de documentos. Crear, renombrar, eliminar o reorganizar bibliotecas es una responsabilidad de administrador porque esos cambios afectan la navegación y la propiedad para todos.

### Carpetas

Las carpetas organizan documentos dentro de una biblioteca. No son cosméticas: dan forma a cómo los usuarios navegan por la biblioteca y cómo los equipos mantienen una estructura compartida a lo largo del tiempo.

Comportamiento importante:
- Las carpetas existen dentro de una biblioteca. No se comparten entre bibliotecas.
- En una vista de biblioteca única, los documentos pueden arrastrarse a carpetas para una reorganización rápida.
- Las carpetas pueden anidarse para crear una estructura de navegación.
- Eliminar una carpeta no elimina sus documentos. Los documentos se mueven a **Sin clasificar** en su lugar.
- Una carpeta con subcarpetas no puede eliminarse hasta que se limpie la jerarquía.

Utilice carpetas para áreas temáticas estables, no para estados temporales de flujo de trabajo. El estado y el flujo de trabajo ya existen para eso.

### Filtros de alcance

El filtro de alcance de nivel superior cambia qué documentos se listan:

- **Mis documentos** se centra en documentos de los que usted es responsable.
- **Documentos de mi equipo** se centra en documentos propiedad de su equipo.
- **Todos los documentos** elimina el alcance de propiedad y muestra toda la población que tiene permiso de ver.

Si no está asignado a un equipo, el alcance de equipo no está disponible. Su última elección de alcance se recuerda, lo cual es conveniente cuando coincide con su modo de trabajo normal y ligeramente confuso cuando olvida que lo cambió ayer.

### Plantillas y tipos de documento

Las plantillas son documentos ordinarios de la Base de conocimiento almacenados en la biblioteca de **Plantillas** y publicados para su reutilización. Crear un documento a partir de una plantilla copia el contenido de la plantilla en un nuevo artículo y preserva la referencia a la plantilla.

Los tipos de documento son importantes porque:
- clasifican el artículo para filtrado e informes
- agrupan plantillas en el selector de creación
- ayudan a los lectores a entender qué tipo de documento están abriendo

Un comportamiento sutil pero importante: si un documento fue creado a partir de una plantilla y usted cambia después su tipo de documento a un tipo diferente, el enlace a la plantilla se borra. Esto evita que el artículo pretenda seguir una plantilla que ya no coincide.

Al navegar por la biblioteca de **Plantillas**, los administradores pueden abrir el panel **Gestionar tipos** para crear, renombrar o desactivar tipos de documento.

### Documentos gestionados

Algunos artículos de la Base de conocimiento se crean desde Solicitudes, Proyectos, Aplicaciones, Activos o Tareas. Estos aparecen como documentos **Integrados**.

Los documentos gestionados mantienen la experiencia de escritura dentro de la Base de conocimiento, pero el espacio de trabajo de origen continúa controlando parte de sus metadatos. En la práctica, esto significa:
- el estado puede estar controlado por el objeto de origen
- la ubicación en carpeta puede estar fijada por el espacio de trabajo de origen
- el tipo de documento o plantilla puede estar fijado
- las relaciones directas pueden ser de solo lectura en la Base de conocimiento
- el flujo de trabajo de revisión de la Base de conocimiento no está disponible para estos documentos
- los documentos gestionados no pueden moverse fuera de la Base de conocimiento ni eliminarse desde la lista de la Base de conocimiento

Esto protege el enlace entre el documento y el registro operativo que lo posee.

## Trabajar con la lista de la Base de conocimiento

La página principal de la Base de conocimiento es un registro de documentos con herramientas de navegación y organización a su alrededor.

### Qué muestra la lista

La cuadrícula predeterminada se centra en la identidad del documento y la gobernanza:

- **Ref**: la referencia permanente `DOC-{número}`
- **Título**
- **Estado**
- **Tipo**
- **Versión**
- **Responsable**
- **Carpeta**
- **Actualizado**

**Columnas adicionales** (ocultas por defecto, disponibles mediante el selector de columnas):
- **Plantilla**: muestra la plantilla a partir de la cual se creó el documento, si existe
- **Biblioteca**: aparece automáticamente cuando se habilita **Todas las bibliotecas**, y puede mostrarse manualmente en caso contrario

### Búsqueda, filtros y navegación

La Base de conocimiento soporta dos estilos de navegación:

- Navegar una biblioteca con su árbol de carpetas cuando ya conoce el área temática.
- Buscar en todas las bibliotecas cuando le importa más el artículo que su ubicación de almacenamiento.

El conmutador de **Todas las bibliotecas** cambia significativamente la experiencia:
- el árbol de carpetas ya no es el controlador principal
- la búsqueda se vuelve más amplia
- la lista puede comparar contenido entre bibliotecas
- la columna Biblioteca se convierte en parte del contexto de resultados

La navegación de biblioteca única es mejor para la curación. La búsqueda en todas las bibliotecas es mejor para la recuperación.

**Filtrado**:
- Barra de búsqueda rápida en la parte superior de la cuadrícula
- Filtros de columna en **Estado**, **Tipo**, **Responsable**, **Carpeta**, **Plantilla** y **Biblioteca** usando selectores de conjunto de casillas

### Mover documentos y carpetas

En una vista de biblioteca única, los documentos pueden arrastrarse a carpetas. Aparece un control de arrastre en cada fila cuando el arrastre está disponible. Esta es la forma más rápida de organizar una biblioteca sin abrir cada artículo.

Los movimientos entre bibliotecas son más controlados:
- requieren permisos más altos
- no están disponibles para documentos gestionados
- los documentos de plantilla están intencionalmente restringidos porque las plantillas están diseñadas para permanecer en el sistema de plantillas, no para desviarse

Las carpetas también pueden arrastrarse entre bibliotecas soltándolas en la pestaña de la biblioteca destino.

Los movimientos de carpetas siguen la misma idea. Reorganizar una carpeta cambia la estructura de navegación para todos los que usan esa biblioteca, así que trátelo como un cambio de arquitectura de información, no solo como organización personal.

### Acciones de la lista

- **Nuevo** (botón dividido): crea un documento en blanco en la biblioteca activa, o abre el selector de plantillas para crear desde una plantilla publicada
- **Mover**: mueve los documentos seleccionados a una carpeta o biblioteca diferente
- **Eliminar**: elimina permanentemente los documentos seleccionados (solo administrador; no disponible para documentos gestionados)

## Crear y dar forma a un documento

Los nuevos artículos pueden comenzar de dos formas:

- **Documento en blanco**: ideal cuando ya conoce la estructura que necesita
- **Desde plantilla**: ideal cuando el equipo desea secciones, lenguaje o expectativas de revisión consistentes

Cuando crea desde una plantilla, el contenido de la plantilla se copia en el nuevo documento. Desde ese punto, el nuevo artículo es independiente. Actualizar la plantilla más tarde no reescribe los documentos existentes.

El espacio de trabajo del documento mantiene la escritura en el centro y la gobernanza en la barra lateral.

Propiedades principales incluyen:
- **Título**: la etiqueta principal que los lectores buscarán y citarán
- **Estado**: el ciclo de vida del artículo
- **Carpeta**: donde vive el artículo dentro de su biblioteca
- **Tipo**: qué tipo de documento es
- **Basado en plantilla**: el linaje de la plantilla, cuando es relevante
- **Resumen**: una breve descripción para contexto

Después del primer guardado, el modelo completo de gobernanza del documento se hace disponible. Es entonces cuando puede gestionar colaboradores, clasificaciones, relaciones, comentarios e historial de versiones contra una referencia de documento estable.

### Estado y su significado

El estado no es decoración. Indica a los lectores con qué seriedad deben tratar el artículo.

| Estado | Significado | Consecuencia práctica |
|--------|------------|----------------------|
| **Borrador** | Trabajo en progreso | Apto para autoría e iteración interna |
| **En revisión** | Bajo revisión formal | La edición está bloqueada mientras el flujo de trabajo está activo |
| **Publicado** | Aprobado para uso normal | Mejor opción para contenido en el que las personas deben confiar |
| **Archivado** | Conservado como registro | Generalmente aún útil para historial, no para orientación activa |
| **Obsoleto** | Reemplazado o ya no válido | Los lectores no deben seguirlo como práctica actual |

La Base de conocimiento permite la publicación directa incluso sin un flujo de trabajo de revisión formal. Esto es útil para material de bajo riesgo, pero también significa que los equipos necesitan disciplina sobre cuándo la revisión es opcional y cuándo debería esperarse.

## Escritura, bloqueos y auto-guardado

La Base de conocimiento usa un bloqueo de edición para que solo una persona edite activamente un documento a la vez.

Cómo funciona:
- entrar en modo de edición adquiere el bloqueo
- otros usuarios aún pueden abrir y leer el artículo
- no pueden editar mientras el bloqueo está retenido por otra persona
- si el bloqueo expira o se pierde, el modo de edición se detiene y debe reingresarse

Esto evita sobrescrituras silenciosas, lo cual es excelente para la integridad del documento y menos excelente si dos personas pensaron que tenían "solo un ajuste rápido".

Mientras edita:
- los cambios se guardan manualmente con **Guardar**
- el contenido no guardado también se auto-guarda periódicamente mientras su bloqueo está activo
- **Descartar** vuelve al último estado guardado

El espacio de trabajo también soporta la subida de imágenes en línea dentro del área de contenido markdown, para que las capturas de pantalla y diagramas puedan vivir con el artículo en lugar de en una carpeta misteriosa en el escritorio de alguien. Cuando pega o referencia una imagen desde una URL externa, la imagen se importa y almacena automáticamente dentro del documento para que permanezca disponible incluso si la URL original deja de funcionar.

## Importar un documento

Puede importar un documento de Word (.docx) a un artículo existente de la Base de conocimiento. El botón **Importar** aparece en la barra de herramientas del espacio de trabajo una vez que el documento se ha guardado al menos una vez y está en modo de edición.

Cómo funciona:
- Haga clic en **Importar** y seleccione un archivo `.docx` de su ordenador.
- Si el artículo ya tiene contenido, un diálogo de confirmación pregunta si desea reemplazarlo. Elegir **Continuar** sobrescribe el markdown actual con el contenido importado.
- El contenido de Word importado se convierte a markdown y se carga en el editor. Las imágenes incrustadas en el archivo de Word se extraen y almacenan como adjuntos en línea.
- Después de la importación, sus cambios no están guardados. Utilice **Guardar** para persistir el contenido importado.

Si la importación encuentra un conflicto de bloqueo (alguien más adquirió el bloqueo) o un bloqueo expirado, el modo de edición termina y se muestra un mensaje apropiado. Reingrese al modo de edición e inténtelo de nuevo.

Las advertencias de importación, como formato no soportado que fue simplificado durante la conversión, aparecen brevemente como una notificación en la parte inferior de la pantalla.

## Formatos de exportación

Los artículos de la Base de conocimiento pueden exportarse como:

- **PDF**
- **DOCX**
- **ODT**

La exportación está disponible cuando el artículo tiene contenido. Esto es útil cuando:
- un documento necesita circular fuera de KANAP
- un revisor prefiere marcas en formato Word
- se necesita una instantánea PDF estable para compartir o archivo

La exportación no reemplaza el artículo en vivo. La versión de la Base de conocimiento sigue siendo la fuente gobernada, mientras que los archivos exportados son formatos de distribución.

## Colaboradores y flujo de trabajo de revisión

Cada documento puede tener un modelo de colaboradores estructurado:

- **Responsable**: la persona responsable del artículo
- **Autores**: personas que ayudan a mantener el contenido
- **Revisores**: revisores de la etapa 1
- **Aprobadores**: aprobadores de la etapa 2

El responsable es operativamente importante. El filtrado por alcance se basa en la propiedad, y un documento sin un responsable claro es mucho más probable que se convierta en "material de referencia importante" que nadie actualiza.

### Flujo de trabajo de revisión

El flujo de trabajo de revisión es opcional pero deliberado:

- los revisores trabajan primero
- los aprobadores actúan después de que la etapa de revisión se complete
- los aprobadores y revisores pueden registrar notas de decisión
- solicitar cambios devuelve el documento para revisión
- el flujo de trabajo registra la última revisión aprobada

Consecuencias importantes:
- no puede solicitar revisión mientras hay cambios sin guardar
- necesita revisores o aprobadores asignados antes de que se pueda solicitar una revisión
- los documentos archivados y obsoletos no son candidatos para una nueva solicitud de revisión
- una vez que comienza la revisión, la edición normal se desactiva hasta que la revisión se apruebe, se soliciten cambios o se cancele la revisión

Esto hace que la revisión sea significativa. Si los autores pudieran seguir editando el contenido durante la aprobación, el documento aprobado sería un objetivo móvil, lo cual es una forma espléndida de crear discusiones y una forma pobre de crear documentación.

## La barra lateral del espacio de trabajo del documento

La barra lateral tiene dos pestañas: **Propiedades** y **Comentarios**.

### Pestaña Propiedades

La pestaña Propiedades organiza los datos de gobernanza en secciones plegables:

- **Estado, Carpeta, Tipo, Plantilla y Resumen** siempre son visibles en la parte superior.
- **Colaboradores**: asigne responsable, autores, revisores y aprobadores. Cada rol se guarda independientemente del guardado principal del documento.
- **Flujo de trabajo de revisión**: muestra el estado actual del flujo de trabajo cuando hay una revisión activa, incluyendo el progreso de las etapas, decisiones de los participantes y actividad reciente del flujo de trabajo. Cuando no hay flujo de trabajo activo, puede solicitar una revisión desde aquí.
- **Clasificación**: etiquete el documento con categorías y flujos del esquema de clasificación de su organización. Se pueden añadir múltiples filas de clasificación.
- **Relaciones**: vincule el documento a aplicaciones, activos, proyectos, solicitudes o tareas. Cada tipo de relación tiene su propio campo de búsqueda y selección.
- **Versiones**: lista las revisiones guardadas con marcas de tiempo. **Revertir** solo está disponible mientras mantenga un bloqueo de edición activo.

### Pestaña Comentarios

La pestaña Comentarios muestra la actividad alrededor del documento: comentarios, eventos de flujo de trabajo e historial de cambios. Utilice los comentarios para contexto de revisión, aclaración editorial o justificación de cambios que deben permanecer adjuntos al artículo.

## Relaciones y contexto entre espacios de trabajo

Los documentos de la Base de conocimiento pueden relacionarse directamente con:

- Aplicaciones
- Activos
- Proyectos
- Solicitudes
- Tareas

Las relaciones no son solo etiquetas. Controlan dónde aparece el documento en otros lugares de KANAP y cómo los usuarios lo descubren desde espacios de trabajo operativos.

Consecuencias de añadir relaciones:
- el documento se vuelve más fácil de encontrar desde el objeto vinculado
- los lectores que abren el objeto obtienen documentación contextual sin tener que buscar manualmente
- los informes y la gobernanza alrededor del objeto se vuelven más completos

Consecuencias de relaciones deficientes:
- documentos útiles permanecen invisibles fuera de la Base de conocimiento
- los usuarios crean duplicados porque no pueden encontrar el artículo existente
- el mismo tema comienza a dispersarse en múltiples documentos

En los espacios de trabajo relacionados, los paneles de Base de conocimiento distinguen entre:
- **Documentos vinculados**: directamente adjuntos al objeto
- **Documentos relacionados**: mostrados a través de contexto y procedencia del trabajo conectado

Esa distinción importa. Los enlaces directos expresan una relación intencional. Los documentos relacionados expresan contexto útil, pero no el mismo nivel de propiedad.

## Buenos hábitos operativos

- Utilice bibliotecas para límites de gobernanza, carpetas para navegación y relaciones para contexto de negocio.
- Mantenga la propiedad actualizada. Un buen artículo con el responsable equivocado generalmente está viviendo con tiempo prestado.
- Utilice plantillas cuando la consistencia importa entre equipos.
- Utilice la revisión para documentos que impulsan decisiones, controles o procesos repetibles.
- Marque el contenido desactualizado como archivado u obsoleto en lugar de dejar que los lectores adivinen.
- Importe documentos de Word cuando migre contenido existente a la Base de conocimiento en lugar de copiar y pegar, para que las imágenes incrustadas se preserven automáticamente.

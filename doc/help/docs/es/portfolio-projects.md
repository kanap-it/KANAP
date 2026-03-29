# Proyectos del portafolio

Los Proyectos del portafolio son los espacios de trabajo de ejecución para las iniciativas aprobadas. Es donde se planifica la entrega, se hace seguimiento del progreso, se mide la carga de trabajo, se coordinan las tareas y se conecta el conocimiento específico del proyecto con el resto de KANAP.

Los proyectos generalmente provienen de solicitudes aprobadas, pero también pueden crearse directamente como proyectos **Fast-track** o **Heredados** cuando la etapa de solicitud no es parte del proceso.

Para la secuenciación a nivel de portafolio y el trabajo de hoja de ruta, use [Planificación del portafolio](portfolio-planning.md). El área de Proyectos es para ejecutar el trabajo una vez que el proyecto existe.

## Dónde encontrarlo

- Espacio de trabajo: **Portafolio**
- Ruta: **Portafolio > Proyectos**

## Permisos

- `portfolio_projects:reader`: abrir la lista y ver los espacios de trabajo de proyectos
- `portfolio_projects:contributor`: actualizar el documento gestionado de **Propósito** y mantener entradas de tiempo de gastos generales del proyecto
- `portfolio_projects:manager`: crear proyectos y gestionar datos del proyecto, estado, equipo, relaciones, cronograma, progreso, tareas, evaluación, comentarios y decisiones
- `portfolio_projects:admin`: incluye las capacidades de gestor y también puede importar/exportar CSV y mantener entradas de tiempo de gastos generales del proyecto de otros usuarios
- La visualización de la Base de conocimiento también requiere acceso a la Base de conocimiento
- Crear o vincular conocimiento independiente también requiere un rol de creación de Base de conocimiento

Si Proyectos no aparece en la navegación, solicite acceso a un administrador.

## Trabajar con la lista

La lista de proyectos está diseñada para responder dos preguntas rápidamente: "¿qué debería importarme?" y "¿qué se está moviendo?"

**Selector de alcance**

- **Mis proyectos** muestra proyectos donde usted está explícitamente involucrado como patrocinador, responsable o colaborador
- **Proyectos de mi equipo** amplía esa vista a proyectos que involucran a miembros de su equipo de portafolio
- **Todos los proyectos** elimina ese filtro de participación
- Si no está asignado a un equipo de portafolio, el alcance de equipo no está disponible
- Su preferencia de alcance se recuerda, así que la lista vuelve como la dejó

**Comportamiento predeterminado**

- Los proyectos se ordenan por puntuación de prioridad a menos que cambie el orden
- Los proyectos en estado **Completado** están ocultos por defecto
- La búsqueda funciona en contenido de texto
- Los filtros de estado, origen, fuente, categoría, flujo y empresa están disponibles directamente en la cuadrícula

**Lo que enfatiza la cuadrícula**

- Número de referencia (`PRJ-...`) y nombre para identificación rápida
- Prioridad y estado para la postura de ejecución
- Origen para distinguir trabajo basado en solicitudes de trabajo fast-track o heredado
- Progreso para visibilidad de entrega
- Campos de clasificación para informes y segmentación del portafolio
- Fechas planificadas y fecha de creación para contexto de programación

Abrir un proyecto desde la lista preserva el contexto actual de la lista. Eso importa porque el espacio de trabajo del proyecto usa el mismo contexto para la navegación **Anterior** y **Siguiente**, así que puede revisar un conjunto filtrado sin perder su lugar.

**Administración masiva**

- **Nuevo proyecto** está disponible para gestores
- **Importar CSV** y **Exportar CSV** están disponibles para administradores

## Crear un proyecto

La creación directa de proyectos es para trabajo que debe entrar en ejecución sin un registro de solicitud separado.

- Los nuevos proyectos se abren solo en **Resumen**
- Hasta que el proyecto se guarde por primera vez, las demás pestañas no están disponibles
- Los proyectos creados directamente usan un origen de **Fast-track** o **Heredado**
- Los proyectos con origen de solicitud mantienen su origen de solicitud y vínculo de fuente

Use **Fast-track** para trabajo que genuinamente se introduce directamente en la entrega. Use **Heredado** para trabajo que ya existe fuera del historial normal de recepción. Esa distinción afecta los informes y hace que el análisis posterior del portafolio sea mucho menos confuso.

## Modelo mental del espacio de trabajo

El espacio de trabajo del proyecto tiene dos capas:

- El **área de contenido principal** para pestañas operacionales: **Resumen**, **Actividad**, **Cronograma**, **Progreso**, **Tareas**, **Evaluación** y **Base de conocimiento**
- Una **barra lateral de Propiedades del proyecto** persistente para propiedades principales, asignación de equipo y relaciones

Este es el cambio de comportamiento más importante respecto a la documentación anterior: **Equipo** y **Relaciones** ya no son pestañas independientes. Ahora viven en la barra lateral y permanecen disponibles mientras trabaja en cualquier otro lugar.

Para proyectos existentes, la barra lateral se comporta como un panel de propiedades en vivo: los cambios allí se guardan inmediatamente. El contenido de la pestaña principal sigue el flujo habitual de **Guardar** y **Restablecer** cuando esa pestaña contiene cambios en borrador. Si cambia de pestaña o se mueve al proyecto anterior o siguiente con cambios no guardados en el espacio de trabajo, KANAP pregunta si desea guardar primero.

## Encabezado y navegación

El encabezado del espacio de trabajo no es solo decoración; es la barra de control del proyecto.

- La etiqueta `PRJ-...` es la referencia estable legible y se puede copiar directamente
- La etiqueta de estado muestra el estado de ejecución actual
- La etiqueta de origen muestra cómo el proyecto entró al portafolio
- Los proyectos con origen de solicitud exponen un camino directo de vuelta a la solicitud fuente
- La barra de progreso en el encabezado muestra el progreso de ejecución actual sin salir de la página
- **Anterior** y **Siguiente** se mueven por el conjunto de resultados de la lista actual, no por todos los proyectos del sistema
- **Enviar enlace** envía por correo la URL actual del proyecto con un mensaje opcional

Enviar un enlace no otorga acceso. Solo comparte la ubicación. Los permisos permanecen exactamente como estaban antes de enviar el correo, que es como debe ser.

## Barra lateral de Propiedades del proyecto

Trate la barra lateral como la tarjeta de identidad persistente del proyecto.

### Propiedades principales

La sección principal contiene los campos del proyecto que definen cómo aparece el proyecto en otros lugares de KANAP:

- nombre del proyecto
- estado
- origen solo durante la creación inicial
- origen, categoría y flujo
- empresa y departamento
- inicio planificado y fin planificado

Estos campos impulsan los informes, la planificación, el filtrado y el contexto predeterminado del portafolio. Las elecciones de clasificación son especialmente importantes porque afectan dónde aparece el proyecto en el análisis transversal del portafolio.

Cambiar el estado desde la barra lateral es más que una actualización de etiqueta. KANAP abre un diálogo de cambio de estado para que la transición pueda registrarse adecuadamente. Ahí es donde puede registrar el cambio como una decisión formal, capturar contexto y almacenar la justificación con la transición en lugar de dejarla desaparecer en la memoria de pasillo.

El flujo de trabajo está controlado intencionalmente:

- **Lista de espera** puede pasar a **Planificado**, **En espera** o **Cancelado**
- **Planificado** puede pasar a **En progreso**, **En espera** o **Cancelado**
- **En progreso** puede pasar a **En pruebas**, **Completado**, **En espera** o **Cancelado**
- **En pruebas** puede volver a **En progreso**, o avanzar a **Completado**, **En espera** o **Cancelado**
- **En espera** puede volver a **Lista de espera**, **Planificado** o **En progreso**, o ser **Cancelado**
- **Completado** y **Cancelado** son estados terminales

### Equipo

La asignación de equipo es parte de la barra lateral para que permanezca disponible mientras trabaja en cronograma, esfuerzo o tareas.

- Patrocinador de negocio / Patrocinador IT capturan la responsabilidad ejecutiva
- Responsable de negocio / Responsable IT identifican el liderazgo del día a día
- Colaboradores de negocio / Colaboradores IT definen el equipo de trabajo más amplio

Estas asignaciones hacen más que llenar casillas:

- determinan qué aparece en **Mis proyectos** y **Proyectos de mi equipo**
- alimentan el contexto del proyecto en resumen e informes
- definen quién está disponible para la asignación de esfuerzo en la pestaña **Progreso**

Si los responsables y colaboradores son incorrectos, su planificación de esfuerzo también será incorrecta.

### Relaciones

La sección de relaciones reúne los vínculos que explican cómo el proyecto encaja en el resto del portafolio.

- Las **Dependencias** rastrean dependencias de entrega con otras solicitudes o proyectos
- Las **Solicitudes de origen** muestran el registro de solicitud que produjo el proyecto
- las relaciones adicionales capturan contexto de negocio y técnico conectado

Las dependencias son operacionales, no cosméticas. Determinan cómo deben interpretarse los retrasos y la secuenciación. Los vínculos de solicitud de origen preservan la cadena desde la recepción hasta la ejecución, lo cual es esencial cuando alguien más adelante pregunta, "¿por qué estamos haciendo este proyecto?"

## Resumen

La pestaña **Resumen** es la cabina de mando del proyecto. Está destinada a responder el estado actual del proyecto en una sola pasada, no a duplicar cada campo de la barra lateral.

Las tarjetas del resumen cubren:

- estado actual y prioridad
- ventana de entrega y variación del cronograma
- consumo de esfuerzo y postura de tareas
- cobertura de equipo y relaciones
- huella de conocimiento
- última actividad

Esta pestaña es donde un gestor puede entender si el proyecto está meramente vivo en la base de datos o realmente bajo control.

### Propósito

La sección de **Propósito** en el Resumen es un documento gestionado del proyecto, no un campo de notas desechable.

- úselo para el resumen narrativo del proyecto: intención, resultado esperado, límites de alcance y cualquier encuadre que deba acompañar al proyecto
- los cambios de propósito siguen el flujo de **Guardar** y **Restablecer** del espacio de trabajo
- los colaboradores pueden actualizar el Propósito incluso cuando no pueden gestionar el resto del proyecto

Esta división es deliberada. Permite que la propiedad narrativa sea más amplia que la administración estructural del proyecto.

El editor de Propósito incluye importación y exportación de documentos:

- **Importar** acepta un archivo `.docx` y lo convierte al formato markdown interno. Si el Propósito ya tiene contenido, KANAP pide confirmación antes de reemplazarlo.
- **Exportar** le permite descargar el Propósito actual como PDF, DOCX u ODT.

Estas herramientas son útiles cuando un resumen de proyecto se origina en Word o cuando los interesados necesitan una copia formateada fuera de KANAP.

El documento gestionado de Propósito es diferente de la pestaña **Base de conocimiento**:

- **Propósito** es el resumen integrado, propiedad del proyecto
- **Base de conocimiento** es para documentos independientes que pueden necesitar su propio ciclo de vida, reutilización o relaciones

## Actividad

La pestaña **Actividad** separa la conversación de la evidencia de auditoría:

- **Comentarios** para discusión, notas contextuales y decisiones formales
- **Historial** para la pista de auditoría de cambios de campo y estado

Los gestores pueden añadir y editar comentarios del proyecto. Los comentarios también pueden registrarse como decisiones formales, con un resultado y un cambio de estado opcional. Use eso cuando la discusión misma cambia el rumbo del proyecto.

Las imágenes pueden incluirse en los comentarios de actividad cuando la evidencia visual es útil. Eso es práctico para bocetos de arquitectura, capturas de pantalla o evidencia de revisión.

Use **Historial** cuando necesite saber qué cambió. Use **Comentarios** cuando necesite saber por qué.

## Cronograma

La pestaña **Cronograma** es donde la estructura de entrega se hace explícita.

### Fechas del proyecto

El Cronograma muestra tanto las fechas planificadas como las reales.

- las fechas planificadas describen la ventana de entrega prevista
- las fechas reales se capturan por eventos de ejecución y son de solo lectura en el espacio de trabajo

Una vez que el proyecto entra en ejecución, KANAP también captura fechas de referencia para que la desviación del cronograma posterior pueda medirse en lugar de adivinarse.

### Fases

Los proyectos pueden comenzar con una plantilla de fases o un plan de fases completamente personalizado.

- si no existen fases todavía, aplique una plantilla para crear la estructura inicial
- una vez que las fases existen, pueden reordenarse, renombrarse, fecharse y gestionarse por estado
- las fases pueden marcarse como hitos
- cada fase incluye un acceso directo para crear una tarea ya vinculada a esa fase y proyecto
- **Reemplazar con plantilla** reconstruye la estructura de fases, así que úselo solo cuando realmente quiera decir "empezar el modelo de fases de nuevo"

El modelo de fases afecta más que el cronograma:

- la fase activa aparece de vuelta en el **Resumen**
- las tareas vinculadas a fases heredan el contexto de entrega inmediatamente
- los hitos de fase proporcionan marcadores de finalización sin crear un esquema de seguimiento separado

### Hitos

Los hitos pueden crearse de dos formas:

- habilitando el seguimiento de hitos en una fase
- añadiendo hitos independientes manualmente

Los hitos vinculados a fases siguen la fase a la que están adjuntos. Los hitos independientes son para puntos de control que deben existir fuera de la estructura de fases.

### Vistas de tabla y Gantt

El cronograma puede gestionarse como tabla o como vista Gantt.

- use la tabla cuando está dando forma a la estructura
- use el Gantt cuando necesite ver superposición, secuenciación y distribución de fechas

Solo las fases con fechas de inicio y fin utilizables aparecen de forma significativa en el Gantt. Si las fechas son vagas, el gráfico será igualmente vago.

## Progreso

La pestaña **Progreso** combina el progreso de ejecución, la planificación de carga de trabajo y el consumo real de tiempo. Esa combinación importa porque un proyecto que informa 80% de progreso con 20% del esfuerzo consumido no es necesariamente eficiente; puede simplemente estar mal estimado.

### Progreso y carga de trabajo

- **Progreso de ejecución** es la señal general de completitud del proyecto
- **Consumo de carga de trabajo** compara el esfuerzo real con el esfuerzo planificado

Mantenga estos dos números alineados con la realidad. Si el progreso avanza sin esfuerzo correspondiente, o el esfuerzo se acumula sin movimiento de entrega, la discrepancia generalmente le está diciendo algo importante sobre alcance, estimación o disciplina de informes.

### Esfuerzo estimado y asignaciones

El Progreso separa el esfuerzo estimado en:

- **Esfuerzo IT**
- **Esfuerzo de negocio**

Cada lado puede asignarse entre el responsable y los colaboradores relevantes. Esas asignaciones dependen del equipo configurado en la barra lateral, así que los cambios de equipo tienen consecuencias de planificación aquí también.

### Esfuerzo real y registro de tiempo

El esfuerzo real se calcula de dos fuentes:

- Tiempo de **Gastos generales del proyecto** registrado directamente en el proyecto
- **Tiempo de tareas** registrado desde las tareas del proyecto

El registro de tiempo fusiona ambos en una sola vista e identifica la fuente de cada entrada. Esto es intencional: el esfuerzo del proyecto debe entenderse como la huella completa de entrega, no como una pelea entre "trabajo del proyecto" y "trabajo de tareas".

Consecuencias importantes:

- el tiempo de tareas contribuye al esfuerzo real del proyecto automáticamente
- el tiempo de tareas es visible aquí pero debe corregirse en el espacio de trabajo de la tarea
- las entradas de gastos generales del proyecto se mantienen desde la pestaña Progreso
- los colaboradores pueden mantener sus propias entradas de gastos generales del proyecto
- los administradores pueden mantener las entradas de gastos generales del proyecto de todos los usuarios

### Esfuerzo de referencia

Cuando el proyecto pasa a **En progreso**, KANAP captura valores de esfuerzo de referencia. Los cambios posteriores se muestran como variación contra esa referencia, lo cual es útil para distinguir actualizaciones normales de entrega de una expansión silenciosa del alcance.

## Tareas

La pestaña **Tareas** es la cola de ejecución del proyecto.

- las tareas creadas aquí se vinculan automáticamente al proyecto
- las tareas también pueden crearse directamente desde una fase del cronograma, lo que las vincula tanto al proyecto como a la fase seleccionada
- la pestaña soporta filtrado por estado y filtrado por fase
- la vista predeterminada de tareas se enfoca en el trabajo activo ocultando elementos completados y cancelados

Esta pestaña es para gestionar tareas vinculadas al proyecto en contexto, no para reemplazar el espacio de trabajo completo de tareas. Abrir una tarea le lleva a su propio espacio de trabajo, donde continúan el detalle específico de la tarea y el registro de tiempo.

Desde la perspectiva del proyecto, la consecuencia importante es esta: el estado de la tarea y el tiempo de la tarea no están aislados. Se retroalimentan en **Resumen** y **Progreso**, así que las tareas descuidadas hacen que el panorama completo del proyecto sea menos confiable.

## Evaluación

La pestaña **Evaluación** mantiene la entrega vinculada a la priorización.

- para proyectos con origen de solicitud, la solicitud fuente permanece visible como referencia de evaluación
- para proyectos fast-track y heredados, la evaluación se mantiene directamente en el proyecto
- los gestores pueden revisar o actualizar la evaluación, incluyendo anulaciones de prioridad donde las reglas del portafolio lo permitan

La puntuación de prioridad resultante importa fuera de esta pestaña:

- aparece en el encabezado del proyecto
- es visible en la lista
- afecta cómo se clasifican los proyectos cuando la lista se ordena por prioridad

Si la evaluación se aleja de la realidad de entrega, las discusiones del portafolio se vuelven más difíciles de lo necesario.

## Base de conocimiento

La pestaña **Base de conocimiento** conecta el proyecto con documentos independientes de la Base de conocimiento.

Distingue entre:

- **documentos vinculados**: documentos directamente adjuntos al proyecto
- **documentos relacionados**: documentos descubiertos a través de otras entidades vinculadas como solicitudes de origen, dependencias o elementos conectados

Esta distinción importa:

- los vínculos directos representan documentación que el proyecto explícitamente posee o usa
- los vínculos relacionados proporcionan contexto sin pretender que todo pertenece directamente al proyecto

Dependiendo de sus permisos de Base de conocimiento, puede:

- crear un nuevo documento en blanco ya vinculado al proyecto
- crear un documento vinculado desde una plantilla
- vincular un documento existente
- desvincular documentos directamente vinculados
- abrir cualquier documento vinculado o relacionado en la Base de conocimiento

Si puede abrir el proyecto pero no tiene derechos de visualización de la Base de conocimiento, KANAP le indicará que el conocimiento existe sin exponer el contenido del documento. Ese es el comportamiento esperado, no una pestaña rota.

La Base de conocimiento también aparece de vuelta en el **Resumen**, donde el proyecto muestra cuánta documentación independiente está vinculada y cuándo se actualizó por última vez.

## Importación y exportación CSV

Las herramientas CSV del proyecto están disponibles desde la página de lista para administradores.

### Exportación

Las exportaciones soportan:

- **Exportación completa**
- **Enriquecimiento de datos**
- **Selección personalizada**

Use **Enriquecimiento de datos** cuando quiera exportar, ajustar campos seleccionados externamente e importar el resultado de vuelta a KANAP sin complicaciones.

### Importación

Las importaciones están diseñadas para cambios masivos controlados:

- descargue una plantilla primero cuando necesite la estructura correcta
- valide antes de importar
- use opciones avanzadas para elegir el comportamiento de enriquecimiento vs reemplazo y las reglas de insertar/actualizar

La importación masiva es útil para el mantenimiento de portafolios grandes, pero no es un atajo para eludir la gobernanza de proyectos. La planificación de fases, tareas, conocimiento y el control continuo de la entrega siguen perteneciendo al espacio de trabajo.

## Enviar un enlace

Use **Enviar enlace** desde el encabezado del espacio de trabajo para enviar por correo un enlace directo al proyecto a destinatarios internos o externos.

- puede enviarlo a usuarios de la plataforma o a cualquier dirección de correo
- puede incluir un mensaje opcional
- el enlace copiado o enviado por correo apunta directamente al espacio de trabajo del proyecto

De nuevo, enviar un enlace no otorga acceso. Solo evita que las personas tengan que buscar el proyecto por su cuenta.

## Guía práctica

- Use la barra lateral para datos estructurales que deben permanecer visibles mientras trabaja.
- Use **Resumen** para la narrativa del proyecto y el panorama operacional de alto nivel.
- Use **Cronograma** para definir la estructura de entrega antes de que crezca el volumen de tareas.
- Use **Progreso** regularmente, de lo contrario la variación del esfuerzo llega como sorpresa aunque los datos ya le estaban advirtiendo.
- Use **Base de conocimiento** para documentación reutilizable o gobernada, no como segunda copia del resumen de Propósito.
- Use **Importar** en el editor de Propósito cuando un resumen del proyecto ya existe como documento Word, en lugar de reformatearlo a mano.

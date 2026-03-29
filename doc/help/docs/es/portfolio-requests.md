# Solicitudes del portafolio

Las Solicitudes del portafolio son la capa de recepción para el trabajo propuesto. Una solicitud le permite capturar la necesidad de negocio, evaluar la viabilidad, puntuar la prioridad, recopilar conocimiento de soporte y decidir si la iniciativa debe avanzar como proyecto. En la práctica, aquí es donde las ideas se convierten en trabajo gobernado en lugar de folclore de pasillo.

## Dónde encontrarlo

- Espacio de trabajo: **Portafolio**
- Ruta: **Portafolio > Solicitudes**

### Permisos

| Permiso | Qué permite |
| --- | --- |
| `portfolio_requests:reader` | Abrir la lista de solicitudes y ver los espacios de trabajo de solicitudes |
| `portfolio_requests:member` | Editar los documentos gestionados incrustados en el espacio de trabajo de la solicitud, incluso sin derechos más amplios de gestión de solicitudes |
| `portfolio_requests:manager` | Crear solicitudes, actualizar datos de solicitud, mantener equipo y relaciones, añadir comentarios y decisiones, cambiar estado, enviar recomendaciones de análisis y editar evaluación |
| `portfolio_requests:admin` | Eliminar solicitudes y usar importación/exportación CSV |

La pestaña **Base de conocimiento** sigue los permisos de Base de conocimiento para las acciones de creación y vinculación. Un usuario puede tener permiso para trabajar en el contenido de la solicitud sin tener permiso para crear o revincular documentos de conocimiento independientes.

## Trabajar con la lista

La lista está diseñada para triaje más que para navegación de archivo. Por defecto, ordena las solicitudes por prioridad para que el trabajo más urgente o estratégicamente importante aparezca primero.

### Filtros de alcance

Use el selector de alcance sobre la cuadrícula para controlar la cartera de quién está viendo:

- **Mis solicitudes** muestra solicitudes donde usted está explícitamente involucrado, como solicitante, patrocinador, responsable o colaborador.
- **Solicitudes de mi equipo** amplía esa vista a solicitudes que involucran a miembros de su equipo de Portafolio. Esta opción no está disponible si no está asignado a un equipo.
- **Todas las solicitudes** elimina el filtro de participación y muestra la cartera completa de solicitudes.

Su elección de alcance se recuerda. Si abre una solicitud desde la lista y vuelve más tarde, KANAP mantiene el contexto de la lista para que no tenga que reconstruir su pila de filtros cada vez.

### Columnas predeterminadas

La cuadrícula estándar destaca los campos que importan durante la recepción y revisión:

- **#**
- **Nombre de la solicitud**
- **Prioridad**
- **Estado**
- **Origen**
- **Categoría**
- **Flujo**
- **Empresa**
- **Solicitante**
- **Fecha objetivo**
- **Creado**

Se pueden mostrar columnas adicionales, como **Última modificación**, a través de las preferencias de la cuadrícula cuando sea necesario.

### Comportamiento de filtrado

- La búsqueda global funciona en el contenido de la solicitud y los metadatos de negocio visibles.
- Los filtros de columna están disponibles para los principales campos de clasificación y propiedad.
- Las solicitudes con estado **Convertida** están ocultas por defecto para que la lista se mantenga enfocada en la recepción activa. Si necesita revisar decisiones históricas de recepción, incluya **Convertida** en el filtro de Estado.

### Acciones de la lista

- **Nueva solicitud** está disponible para gestores de solicitudes.
- **Importar CSV** y **Exportar CSV** están disponibles para administradores de solicitudes.

## El espacio de trabajo de la solicitud

El espacio de trabajo actual usa un modelo dividido:

- El área principal es para narrativa, análisis, evaluación, actividad y conocimiento.
- La barra lateral de propiedades a la derecha es para metadatos estables de la solicitud, asignación de equipo y relaciones.

Esto importa porque no todo se guarda de la misma manera:

- Los cambios en la **barra lateral de propiedades** se aplican directamente a la solicitud.
- Los cambios en **Resumen**, **Análisis** y **Evaluación** son ediciones del espacio de trabajo y usan **Guardar** / **Restablecer**.
- Los documentos gestionados **Propósito** y **Riesgos y mitigaciones** también usan el flujo de guardado del espacio de trabajo.

Si crea una nueva solicitud, KANAP comienza en **Resumen**. Las otras pestañas se vuelven útiles después de que la solicitud exista como un registro real en lugar de una idea muy sincera.

El encabezado del espacio de trabajo le da contexto operacional sin salir de la página:

- una referencia copiable de la solicitud como `REQ-42`
- el estado actual
- la tarea de origen cuando la solicitud fue creada desde trabajo de tarea
- **Enviar enlace** para compartir
- navegación anterior/siguiente basada en el contexto exacto de la lista de donde vino

### Modelo mental de la barra lateral de propiedades

Trate la barra lateral como la columna vertebral estructural de la solicitud.

#### Propiedades principales

Esta sección contiene la identidad y clasificación de la solicitud:

- Nombre de la solicitud
- Estado
- Origen, Categoría y Flujo
- Solicitante
- Empresa y Departamento
- Fecha de entrega objetivo

Estos campos determinan cómo la solicitud se enruta, filtra y revisa en otros lugares del espacio de trabajo. Por ejemplo:

- cambiar el **Estado** afecta qué decisiones pueden seguir y si la conversión está disponible
- cambiar la **Categoría** o el **Flujo** cambia el contexto analítico para la viabilidad y la evaluación
- cambiar la **Empresa** o el **Solicitante** cambia la visibilidad de informes y propiedad en todo el portafolio

#### Equipo

La sección Equipo asigna responsabilidades en lugar de solo mantener una lista de contactos:

- Patrocinador de negocio
- Responsable de negocio
- Patrocinador IT
- Responsable IT
- Colaboradores de negocio
- Colaboradores IT

Estas asignaciones impulsan la visibilidad compartida y dejan claro quién se espera que patrocine, dé forma y entregue la solicitud. El Resumen usa estos datos para mostrar si la solicitud tiene suficiente propiedad nombrada para avanzar de forma sensata.

#### Relaciones

Las relaciones explican cómo la solicitud encaja en el portafolio más amplio:

- Las **Dependencias** identifican trabajo que debe existir, terminar o permanecer alineado antes de que esta solicitud pueda tener éxito.
- Los **Proyectos resultantes** muestran lo que se creó a partir de la solicitud después de la conversión.

Esta sección es importante para el análisis de impacto. Una solicitud con datos de relación débiles puede parecer inofensiva hasta que colisiona con trabajo existente.

Los marcadores antiguos pueden aún apuntar a `overview`, `team` o `relations`. En el espacio de trabajo actual, ese contenido vive en **Resumen** y la barra lateral de propiedades.

## Resumen

**Resumen** es la cabina de mando de la solicitud. No es una simple pestaña de vista general; es donde KANAP comprime el estado de la solicitud en una instantánea operacional.

El Resumen incluye:

- **Instantánea de estado**, incluyendo estado actual, prioridad actual, procesos de negocio vinculados y última actividad
- **Instantánea de análisis**, incluyendo la señal de viabilidad más fuerte y la última recomendación de análisis
- **Equipo y conocimiento**, incluyendo cobertura de roles, recuento de colaboradores, tarea de origen y recuentos de conocimiento vinculado
- el documento gestionado de **Propósito**
- un feed de **Actividad reciente**

Use el Resumen cuando necesite entender si la solicitud está meramente registrada o realmente lista para ser discutida, evaluada y convertida.

### Propósito como documento gestionado

La sección de **Propósito** es un documento markdown gestionado incrustado directamente en la solicitud. Es más que un campo de descripción largo:

- da a los revisores una declaración estable de intención
- está disponible durante la conversión de solicitud a proyecto
- puede ser editado por usuarios con `portfolio_requests:member`, incluso si no gestionan el resto de la solicitud
- soporta **importación DOCX** para que pueda traer documentos Word existentes directamente, y **exportación** para descargar el contenido actual

Esa división es deliberada. Permite a los colaboradores expertos en la materia mejorar la narrativa de la solicitud sin abrir el control total sobre el estado, la evaluación y la estructura del portafolio.

## Actividad

**Actividad** separa la discusión de la pista de auditoría:

- **Comentarios** es el flujo de colaboración
- **Historial** es el registro de cambios

### Comentarios

Los comentarios soportan discusión normal, pero también soportan **decisiones formales**. Una decisión formal puede capturar:

- el contexto de la reunión o decisión
- el resultado de la decisión
- la justificación
- un cambio de estado opcional en la misma acción

Esa combinación es importante. Mantiene la gobernanza trazable: el registro de *por qué* algo cambió permanece adjunto al cambio en lugar de ser reconstruido posteriormente de memoria y optimismo.

Los comentarios soportan markdown e imágenes en línea, lo cual es útil para notas de diseño, evidencias, capturas de pantalla y material de revisión.

### Historial

El historial es la vista de auditoría. Úselo cuando necesite responder preguntas como:

- quién cambió el estado
- cuándo cambiaron las asignaciones de equipo
- si un cambio de evaluación o análisis ocurrió antes o después de una decisión

Si necesita narrativa, use Comentarios. Si necesita pruebas, use Historial.

## Análisis

**Análisis** es donde la solicitud pasa de "suena razonable" a "entendida lo suficiente para decidir".

Reúne cuatro elementos distintos:

- procesos de negocio impactados
- revisión de viabilidad estructurada
- **Riesgos y mitigaciones** gestionados
- la **Recomendación de análisis** formal

### Procesos de negocio impactados

Vincule los procesos de negocio afectados por la solicitud. Esto cambia el significado de la solicitud en términos de portafolio: una solicitud que afecta procesos operacionales centrales no debe evaluarse de la misma manera que una mejora de conveniencia local.

### Revisión de viabilidad

La revisión de viabilidad es una evaluación estructurada en siete dimensiones. Cada dimensión puede evaluarse con un nivel de preocupación y notas de soporte.

Use esta sección para exponer fricciones de entrega temprano:

- no todas las solicitudes fallan porque la idea es mala
- muchas fallan porque las restricciones de integración, infraestructura, seguridad, cronograma o gestión del cambio se ignoraron hasta que fue demasiado tarde

La pestaña Resumen muestra el nivel de preocupación más fuerte de esta revisión para que los problemas importantes permanezcan visibles incluso cuando nadie abre Análisis.

### Riesgos y mitigaciones

**Riesgos y mitigaciones** es otro documento markdown gestionado. Úselo para documentar riesgo residual, acciones de mitigación y propiedad. Como el Propósito, puede ser editado por usuarios con `portfolio_requests:member` y soporta **importación DOCX** para traer documentos Word existentes, así como **exportación**.

Esto es útil cuando las personas mejor posicionadas para describir los riesgos no son las mismas personas que deberían estar cambiando el estado de la solicitud o la estructura del portafolio.

### Recomendación de análisis

El flujo de recomendación publica una decisión formal en Actividad con el contexto fijo **Recomendación de análisis**. También puede cambiar el estado de la solicitud al mismo tiempo.

Eso significa que Análisis no es un área aislada de toma de notas. Es parte de la pista de gobernanza:

- los revisores pueden ver la última recomendación directamente en Análisis
- la misma recomendación aparece en Actividad como registro de decisión
- los cambios de estado opcionales permanecen vinculados a la recomendación que los justificó

Las solicitudes más antiguas también pueden mostrar una sección de **Análisis anterior (heredado)**. Ese contenido se conserva por continuidad, pero el modelo actual de solicitud se basa en la revisión de viabilidad, riesgos gestionados y recomendaciones formales.

## Evaluación

**Evaluación** evalúa la solicitud contra el modelo de evaluación del portafolio configurado para su espacio de trabajo.

En la práctica:

- cada criterio activo contribuye a la prioridad calculada
- la puntuación resultante alimenta la comparación del portafolio y el orden de la lista
- se puede usar una anulación cuando la puntuación calculada es correcta matemáticamente pero operacionalmente incorrecta

Si se usa la anulación de prioridad, debe tratarse como una excepción, no como un estilo de vida.

Donde lo permita la configuración del portafolio, las reglas de omisión obligatoria pueden forzar la máxima prioridad para solicitudes que califiquen. Esto se usa típicamente para trabajo que no puede competir sensatamente con la demanda discrecional.

Una vez que una solicitud es **Convertida**, la evaluación se vuelve de solo lectura. En ese punto, la solicitud ya ha cumplido su función como registro de recepción y priorización.

## Base de conocimiento

La pestaña **Base de conocimiento** conecta la solicitud con documentos de conocimiento independientes. No es solo un estante de adjuntos con mejor postura.

La pestaña distingue entre dos tipos de conocimiento:

- Los **documentos vinculados** están directamente adjuntos a la solicitud.
- Los **documentos relacionados** se descubren a través del contexto más amplio de la solicitud, como dependencias, solicitudes relacionadas, proyectos resultantes y otros objetos vinculados.

Esta distinción importa:

- los documentos directos son parte del conjunto de documentación explícita de la solicitud
- los documentos relacionados añaden contexto sin pretender que la solicitud los posea

### Qué puede hacer

Con permisos suficientes de Base de conocimiento, puede:

- crear un nuevo documento de conocimiento en blanco ya vinculado a la solicitud
- crear un documento vinculado desde una plantilla
- vincular un documento de conocimiento existente
- desvincular un documento directamente vinculado
- abrir cualquier documento vinculado o relacionado en el espacio de trabajo de Base de conocimiento

Sin esos permisos, la pestaña sigue funcionando como vista de referencia siempre que tenga permiso para ver el conocimiento subyacente.

### Documentos gestionados versus documentos de la Base de conocimiento

Los documentos gestionados **Propósito** y **Riesgos y mitigaciones** son parte de la solicitud misma. No son lo mismo que los documentos de la Base de conocimiento.

Use documentos gestionados para la narrativa central de la solicitud que siempre debe acompañar a la solicitud. Use la Base de conocimiento para documentos independientes que pueden necesitar su propio ciclo de vida, relaciones, exportaciones, plantillas y reutilización más allá de una sola solicitud.

## Convertir una solicitud en proyecto

Una vez que una solicitud alcanza el estado **Aprobada**, el espacio de trabajo ofrece **Convertir en proyecto**.

El flujo de conversión le permite:

- confirmar o ajustar el nombre del proyecto
- establecer fechas planificadas de inicio y fin
- revisar el texto actual del Propósito
- trasladar el esfuerzo estimado de IT y Negocio derivado de las entradas de evaluación de la solicitud

Después de la conversión:

- la solicitud se convierte en un registro duradero de recepción y decisión
- el proyecto resultante aparece en la sección de Relaciones de la solicitud
- la evaluación se congela en la solicitud
- la solicitud aún puede abrirse para auditoría, contexto y trazabilidad del conocimiento

En otras palabras, la conversión no borra la solicitud. La promueve.

## Importación y exportación CSV

La importación y exportación CSV están disponibles para `portfolio_requests:admin`.

Use la exportación cuando necesite informes del portafolio o enriquecimiento fuera de línea. Use la importación cuando necesite crear o actualizar solicitudes de forma masiva. Como la importación puede alterar registros de recepción a escala, está intencionalmente reservada para administradores.

## Consejos

- **Use importación DOCX para contenido existente**: Si ya tiene una declaración de propósito o un registro de riesgos en un documento Word, use el botón **Importar** en el editor de Propósito o Riesgos y mitigaciones en lugar de copiar y pegar. La importación convierte el documento a markdown y le avisa si algún contenido no pudo trasladarse.
- **Los filtros de alcance se mantienen**: KANAP recuerda su última elección de alcance, así que no necesita volver a seleccionarlo en cada sesión.
- **Las solicitudes convertidas están ocultas por defecto**: Si busca una solicitud que ya fue convertida a proyecto, añada **Convertida** al filtro de Estado en la lista.
- **Permiso de miembro para colaboradores**: Otorgue a los expertos en la materia `portfolio_requests:member` para que puedan editar Propósito y Riesgos y mitigaciones sin poder cambiar el estado, la evaluación o la estructura del portafolio.

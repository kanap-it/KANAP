# Registro de incidentes

El registro de incidentes es el libro de bitácora de los eventos destacables que han afectado a su IT: la caída que detuvo la facturación durante tres horas, el intento de ransomware bloqueado por el filtro de correo, el fallo de almacenamiento que costó un día de copias de seguridad. Cada incidente recibe un número permanente, un diario con marcas de tiempo que nadie puede reescribir y enlaces a los activos, aplicaciones, tareas y documentos implicados.

No es un centro de servicios. Los tickets del día a día siguen en su herramienta de ticketing; el registro conserva los eventos por los que su dirección, sus auditores y su aseguradora preguntarán dentro de un año.

## Qué debe entrar en el registro

Registre un incidente cuando el evento merezca ser recordado:

- Interrupciones de servicio que hayan afectado a usuarios, clientes o a un proceso de negocio
- Eventos de seguridad: intentos de intrusión, software malicioso, fugas de datos, dispositivos perdidos
- Pérdida o corrupción de datos, restauraciones fallidas, huecos en las copias de seguridad
- Fallos graves de un proveedor o de un alojamiento, niveles de servicio incumplidos
- Todo lo que tendrá que explicar más adelante o notificar a una autoridad

No registre el trabajo rutinario: restablecimientos de contraseña, problemas de un solo usuario, solicitudes de cambio estándar o un ticket resuelto en diez minutos sin impacto. Un buen registro contiene unas pocas entradas al mes, no miles.

**Consejo**: guarde el número de ticket en el campo **Referencia externa** para que cualquiera pueda volver al rastro operativo en su herramienta de ticketing.

---

## Primeros pasos

Vaya a **Panorama IT > Incidentes** para ver el registro. Haga clic en **Nuevo incidente** para registrar uno.

**Campos obligatorios**:

- **Título**: un resumen breve y objetivo, p. ej.: «Servicio de correo no disponible en la oficina de Lyon»
- **Gravedad**: Crítica, Mayor, Menor o Baja
- **Detectado**: cuándo se advirtió el incidente (por defecto, ahora)

**Recomendados en la misma pantalla**:

- **Descripción**: qué ocurrió, tal como se observó
- **Categoría**: infraestructura, seguridad, aplicación, datos, proveedor, otros (configurable, véase [Categorías](#categorias))
- **Inicio**: cuándo empezó realmente el incidente, si difiere del momento en que lo advirtió
- **Responsable**: quién se encarga de gestionarlo

El **Declarante** es usted por defecto. Ambas fechas admiten valores pasados: un incidente descubierto el lunes por la mañana puede registrarse como iniciado el sábado por la noche.

**Permisos**:

- Consulta: `incidents:reader`
- Creación, edición, diario, enlaces, archivos adjuntos: `incidents:contributor`
- Reabrir y cancelar: `incidents:admin`

---

## Trabajar con la lista

La lista es el registro en sí: todos los incidentes, con la detección más reciente primero.

**Columnas por defecto**:

| Columna | Qué muestra |
|---------|-------------|
| **Ref** | Referencia del incidente (p. ej.: `INC-14`), monoespaciada |
| **Título** | Resumen breve (haga clic para abrir el incidente) |
| **Categoría** | Clasificación procedente de la configuración de Panorama IT |
| **Gravedad** | Crítica, Mayor, Menor, Baja, con un punto de color |
| **Estado** | Abierto, En curso, Resuelto, Cerrado, Cancelado, con un punto de color |
| **Detectado** | Cuándo se advirtió el incidente |
| **Resuelto** | Cuándo se restableció el servicio |
| **Responsable** | Persona a cargo |
| **Activos** | Número de activos enlazados |
| **Tareas** | Número de tareas de seguimiento |

**Orden por defecto**: **Detectado** descendente (el más reciente primero).

**Columnas adicionales** (ocultas por defecto, disponibles en el selector de columnas): **Cerrado**, **Aplicaciones**, **Creado**.

**Filtrado**: Categoría, Gravedad, Estado y Responsable ofrecen filtros de casillas cuyas opciones se calculan a partir de los incidentes visibles, por lo que solo verá valores presentes en el conjunto de resultados. Las columnas de fecha ofrecen filtros de fecha, incluido un rango: filtre **Detectado** entre dos fechas para obtener un extracto trimestral o anual. La búsqueda cubre el título, la descripción y la referencia (`INC-14`).

**Consejo**: combine Gravedad = Crítica, Mayor con un rango de **Detectado** para construir la lista corta que piden la mayoría de los comités de dirección y las auditorías.

Los filtros aplicados se conservan al abrir un incidente: **Anterior / Siguiente** en el espacio de trabajo recorre esa misma lista corta.

---

## El espacio de trabajo del incidente

Haga clic en cualquier fila para abrir el incidente. El espacio de trabajo tiene un **encabezado** con la referencia y metadatos rápidos, un **cajón de propiedades** a la derecha y un **área de contenido** en el centro que cambia con cada pestaña.

### Encabezado y metadatos

El encabezado muestra el título (editable en el sitio), la referencia `INC-N` (haga clic para copiarla), las acciones de ciclo de vida y **Anterior / Siguiente** para recorrer la lista filtrada.

La línea de metadatos inferior muestra **Estado**, **Gravedad**, **Responsable**, **Detectado** y, una vez resuelto el incidente, la **Duración** entre la detección y la resolución. Gravedad, Responsable y Detectado se cambian directamente desde esa línea.

### Cajón de propiedades

El cajón permanece visible en todas las pestañas y guarda a medida que edita.

**Clasificación**:

- **Categoría**: de la lista configurada en la configuración de Panorama IT
- **Gravedad**: Crítica, Mayor, Menor, Baja. Elija el nivel que refleje el impacto de negocio en ese momento; cada cambio queda anotado en el diario, así que subirlo o bajarlo después es normal y trazable
- **Estado**: Abierto, En curso, Resuelto, Cerrado. El estado solo avanza. Volver atrás se hace con **Reabrir**, para que el registro no pueda rebobinarse discretamente

**Fechas**:

- **Inicio**: cuándo empezó realmente el incidente
- **Detectado**: cuándo se advirtió (obligatorio)
- **Resuelto**: se rellena automáticamente al pasar el estado a Resuelto y sigue siendo editable mientras el incidente está abierto, para corregirlo a la hora real del restablecimiento
- **Cerrado**: de solo lectura, se marca al cerrar el incidente

**Personas**: **Declarante** (quien lo registró) y **Responsable** (quien lo gestiona).

**Origen**: **Referencia externa** para el número de ticket, el identificador de alerta o la referencia de correo por la que se comunicó el incidente por primera vez.

**Conformidad**: **Datos personales afectados**, **Notificación a la autoridad requerida**, **Notificado el** (aparece cuando la notificación es requerida) y **Partes informadas**.

**Registro**: fechas de **Creación** y **Actualización**, de solo lectura.

---

### Vista general

Cinco secciones cuentan el incidente, en el orden en que se lee normalmente un informe de incidente. Cada una guarda automáticamente mientras escribe.

- **Descripción**: qué ocurrió, tal como se observó
- **Impacto**: servicios, ubicaciones y usuarios afectados
- **Causa raíz**: por qué ocurrió
- **Acciones correctivas**: qué se hizo para corregirlo y para prevenirlo. Haga el seguimiento del trabajo real como tareas enlazadas
- **Lecciones aprendidas**: qué conviene retener de este incidente

Para un incidente menor basta con la descripción. Para uno mayor, las cinco secciones son el post-mortem.

---

### Diario

El diario es lo que convierte esto en un registro y no en un formulario. Enumera todo lo que le ha ocurrido al incidente, de lo más reciente a lo más antiguo, y **nada de lo que contiene puede editarse ni eliminarse**, por nadie, en ningún momento.

**Añadir una nota**: escríbala en el redactor de la parte superior y haga clic en **Añadir** (o pulse Ctrl+Intro). La fecha y la hora junto al botón fijan el momento al que se refiere la nota. Por defecto es ahora, y puede situarla en el pasado: una nota añadida el martes puede registrarse como ocurrida a las 23:40 del sábado, y se ordenará en ese punto de la cronología. KANAP guarda por separado el momento en que la nota se grabó realmente, y esa marca de tiempo nunca es editable: así el registro retroactivo sigue siendo honesto.

**Las entradas automáticas** aparecen junto a sus notas:

| Entrada | Cuándo se escribe |
|---------|-------------------|
| **Sistema** | Al crear: «Incidente registrado» |
| **Cambio de estado** | En cada cambio de estado, mostrado como «Estado: En curso → Resuelto» |
| **Cambio de gravedad** | En cada cambio de gravedad, mismo formato |
| **Reabierto** | Al reabrir, con el motivo indicado |
| **Enlaces actualizados** | Cuando se enlazan o desenlazan activos o aplicaciones, nombrándolos |

Cada fila muestra el autor, la hora a la que se refiere (pase el cursor para ver «hace 3 días») y el tipo de entrada para todo lo que no sea una nota simple.

El redactor desaparece en cuanto el incidente se cierra o se cancela. Las modificaciones de campos hechas fuera del diario, como corregir el texto de impacto, quedan en el registro de auditoría de la plataforma y no en el diario.

---

### Relaciones

- **Activos**: los servidores, VM o equipos implicados. Busque y seleccione; enlazar y desenlazar queda anotado en el diario
- **Aplicaciones**: las aplicaciones y servicios afectados, mismo comportamiento
- **Tareas**: el trabajo de seguimiento. Cree una tarea directamente desde el incidente y quedará vinculada a él. La tarea muestra «Incidente · INC-14» en su propia barra lateral, y la columna Tareas del incidente la cuenta

El enlace se hace únicamente desde el lado del incidente. Un activo o una aplicación enlazados muestran el incidente en una sección **Incidentes** de solo lectura en su propia pestaña Relaciones: quien mire un servidor verá su historial de incidencias.

---

### Documentos

Documentos de la base de conocimiento enlazados a este incidente: el post-mortem, el informe del proveedor, el procedimiento seguido. Con `knowledge:member` puede crear un documento directamente desde esta pestaña.

---

### Archivos adjuntos

Arrastre y suelte archivos o haga clic para seleccionarlos: capturas de pantalla, extractos de registros, exportaciones de correo, el informe de incidente del proveedor. Haga clic en un archivo adjunto para descargarlo. Las subidas y eliminaciones se detienen en cuanto el incidente se cierra.

---

## Cerrar, reabrir y cancelar

**Resuelto** significa que el servicio está restablecido. **Cerrado** significa que el registro es definitivo.

Cerrar bloquea el incidente. Campos, notas del diario, enlaces, archivos adjuntos y creación de tareas se rechazan, tanto en la interfaz como a través de la API. La Vista general muestra un aviso de una línea: «Cerrado el 12 de marzo de 2026. Reábralo para hacer cambios.»

**Reabrir** (`incidents:admin`) devuelve un incidente resuelto, cerrado o cancelado a En curso y borra las fechas de resolución y de cierre. El motivo es obligatorio y se escribe en el diario, de modo que el registro muestra por qué se volvió a tocar.

**Cancelar incidente** (`incidents:admin`) es para un registro que nunca debió existir: un duplicado o un evento registrado por error. El motivo es obligatorio, el estado pasa a Cancelado y el incidente queda bloqueado como uno cerrado. No se elimina nada y el número se mantiene: `INC-13` nunca desaparece entre `INC-12` e `INC-14`. Un hueco en la numeración sería lo primero por lo que preguntaría un auditor.

No existe la eliminación.

---

## Conformidad y evidencia para auditoría

Dos interruptores del cajón sostienen la parte normativa del registro:

- **Datos personales afectados**: actívelo en cuanto se hayan expuesto, alterado o perdido datos personales. Es el indicador por el que filtra su delegado de protección de datos
- **Notificación a la autoridad requerida**: actívelo cuando el evento deba comunicarse, por ejemplo a una autoridad de protección de datos, a una agencia nacional de ciberseguridad o a un regulador sectorial. **Notificado el** recoge entonces cuándo lo presentó, y **Partes informadas** enumera a quién se avisó: regulador, aseguradora, clientes afectados, seguridad del grupo

Los plazos y umbrales dependen de su jurisdicción y de su sector. KANAP registra los hechos y las fechas; no decide si usted debe notificar.

**Lo que el registro aporta a un auditor**:

- Una secuencia numerada continua, sin eliminaciones ni huecos
- Para cada incidente: cuándo empezó, cuándo se advirtió, cuándo se resolvió y se cerró, y quién era el responsable
- Un diario imposible de reescribir, con cada cambio de estado y de gravedad fechado y atribuido
- La evidencia en sí, como archivos adjuntos y documentos enlazados
- Las acciones correctivas y las tareas de seguimiento que demuestran que se llevaron a cabo
- Vistas filtradas por periodo, gravedad, categoría o indicador de conformidad, directamente desde la lista
- Una exportación CSV de todo el registro (**Exportar CSV** en la lista), para los auditores y para su propio archivo

**Importar un registro existente**: **Importar CSV** en la lista acepta un archivo CSV. Deje la columna de referencia vacía para crear incidentes (KANAP asigna los siguientes números INC), o conserve la referencia INC-N para actualizar los registros correspondientes. Cada incidente importado recibe una entrada de diario que indica que procede de un archivo. Exporte primero si quiere la disposición exacta de las columnas.

---

## Categorías

Las categorías de incidente son suyas: defínalas en **Panorama IT > Configuración**, en **Incidentes > Categorías de incidente**. KANAP incluye de serie infraestructura, seguridad, aplicación, datos, proveedor y otros.

Mantenga la lista corta. Las categorías son aquello por lo que agrupará un año de incidentes, y una lista de treinta es una lista que nadie usa de forma coherente. En lugar de eliminar una categoría que ya está en uso, márquela como obsoleta: desaparece del selector para los nuevos incidentes mientras los existentes conservan su historial.

---

## Consejos

- **Registre pronto, complete después**: cree el incidente mientras está ocurriendo, con un título y una gravedad. El diario está pensado para ir añadiendo hechos según llegan
- **Escriba notas objetivas, con horas**: «13:05 conmutación al sitio secundario, correo restablecido para 40 usuarios». Ajuste la fecha y la hora para que la cronología refleje el incidente y no su velocidad al teclear
- **Feche hacia atrás con honestidad**: Inicio y Detectado están para contener las horas reales. La hora de grabación de cada entrada del diario se guarda aparte y no puede modificarse
- **Un incidente, no uno por ticket**: una única caída que generó cuarenta tickets es un solo incidente, enlazado a los activos implicados
- **Convierta las acciones en tareas**: el texto de Acciones correctivas describe la intención; una tarea con responsable y fecha de vencimiento es lo que se hace de verdad
- **Cierre de forma deliberada**: el cierre es el momento en que el registro se convierte en evidencia. Rellene la causa raíz y las lecciones aprendidas antes de cerrar, porque después hará falta un administrador para reabrirlo
- **Revise el registro cada trimestre**: filtre por periodo y gravedad, observe las categorías recurrentes y los activos que aparecen más de una vez. De ahí sale la próxima solicitud de presupuesto

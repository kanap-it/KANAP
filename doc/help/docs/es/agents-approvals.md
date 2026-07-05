# Agentes IA — Aprobaciones

Aprobaciones es la cola de revisión diaria para todo lo que sus agentes IA quieren hacer. Antes de que un agente publique una respuesta, añada una nota, reclasifique un ticket, cambie su estado, lo reasigne o lo cierre, presenta ese trabajo ante usted aquí como una **propuesta**. Nada de lo que hay en esta página ha ocurrido todavía del lado del solicitante: una propuesta es la sugerencia del agente, y solo llega a su sistema de tickets conectado una vez que usted la aprueba. Aquí es donde un operador pasa la mayor parte de su tiempo supervisando un agente de helpdesk: leyendo borradores, aplicando los buenos y rechazando el resto.

## Dónde encontrarlo

- Espacio de trabajo: **Agentes IA**
- Ruta: **Agentes IA → Aprobaciones**
- Ruta técnica: `/agents/approvals`
- Permiso: requiere que la IA esté habilitada en la instancia y el rol Lector de Agentes IA (`ai_agents:reader`)
- La misma cola aparece acotada a un solo agente en la pestaña **Aprobaciones** del [espacio de trabajo](agents-workspace.md) de ese agente. La página en `/agents/approvals` es la vista combinada de todos los agentes; la pestaña del espacio de trabajo muestra solo las propuestas del agente que está viendo. La disposición y los controles son idénticos.

---

## Qué es una propuesta

Cada propuesta es una acción concreta que un agente quiere realizar sobre un ticket. Existen ocho tipos de acción, cada uno con su propia etiqueta e icono:

| Acción | Qué hace |
| --- | --- |
| **Respuesta al solicitante** | Un mensaje que el agente quiere enviar a la persona que abrió el ticket. |
| **Nota interna** | Una nota que el agente quiere añadir para su equipo, no visible para el solicitante. |
| **Clasificación** | Un cambio en la categoría, el tipo, la urgencia u otros atributos similares del ticket. |
| **Estado** | Un paso a un estado de ticket diferente (por ejemplo, de **Nuevo** a **Pendiente**). |
| **Cerrar ticket** | Un cambio de estado terminal que cierra el ticket; consulte [Acciones terminales](#acciones-terminales). |
| **Resolver ticket** | Un cambio de estado terminal que marca el ticket como resuelto; consulte [Acciones terminales](#acciones-terminales). |
| **Asignación** | Un cambio de la persona a la que está asignado el ticket. |
| **Participantes** | Un cambio en los observadores o solicitantes del ticket. |

En el caso de una **Respuesta al solicitante** o una **Nota interna**, el cuerpo que ve es el mensaje redactado completo, exactamente como se publicaría. Léalo como lo haría el solicitante (o su equipo). Para los otros cinco tipos, el cuerpo es un breve resumen del cambio en lugar de texto libre —por ejemplo `Status: New -> Pending`, `Assignee: Unassigned -> Jane`, o una comparación de clasificación campo por campo—, a menudo seguido de una línea **Motivo** que explica por qué el agente lo propone.

Las propuestas se agrupan por ticket. Cada grupo está encabezado por el ticket (**Ticket n.º N**), su estado actual, un recuento como **3 propuestas** y cuándo se actualizó por última vez. Un ticket puede contener varias propuestas a la vez —por ejemplo, una respuesta, una reclasificación y un cambio de estado— y usted puede decidirlas individualmente o todas juntas.

---

## Las cuatro secciones

La cola está organizada en cuatro secciones según dónde se encuentre cada elemento en su ciclo de vida. Cada una tiene su propio mensaje de estado vacío para que pueda distinguir «no hay nada aquí» de «todavía cargando».

### Requiere tu decisión

Las propuestas que esperan por usted, agrupadas por ticket. Esta es la única sección donde usted actúa; las otras tres son informativas. Cuando está vacía, muestra *Nada requiere tu decisión.* Una vez que decide una propuesta, se contrae a una única línea de estado dentro de su grupo de ticket, mientras que las propuestas restantes del ticket permanecen abiertas para usted.

### En curso

Trabajo que ya está en marcha y no requiere nada de usted: propuestas que aprobó y que ahora se están aplicando al sistema de tickets conectado, y tickets que un agente está comprobando activamente. Las filas aquí muestran el estado en vivo, como **Esperando para iniciar**, **En curso**, **Ejecutando…** o **Agente trabajando…**. Cuando no hay actividad, muestra *No hay trabajo de agentes en curso.*

### Requiere atención

Cualquier cosa que haya fallado o esté bloqueada: una propuesta que no se pudo enviar al sistema de tickets conectado, o una comprobación que dio error. Cada fila lleva una leyenda en rojo que explica qué salió mal y un enlace **Traza** a la cronología de [Actividad](agents-activity.md) para que pueda ver la historia completa. Cuando está vacía, muestra *No hay trabajo de agentes que requiera atención.* Esta es la sección que hay que vigilar: los elementos llegan aquí cuando se aprobó un cambio pero el sistema de tickets lo rechazó o no pudo completarlo.

### Finalizadas recientemente

Un historial contraíble de los elementos completados más recientemente: aplicados, rechazados, omitidos o hechos. Permanece plegado hasta que lo abre, recuerda esa elección y muestra hasta unas 30 filas con una línea **+N más** si hay más. Úselo para confirmar que una aprobación realmente se realizó, o para comprobar qué hizo un agente mientras usted estaba ausente.

---

## Tomar una decisión: Aprobar, Ejecutar y Rechazar

Cada propuesta pendiente tiene dos botones.

- El botón principal muestra **Aprobar** en una propuesta que aún no ha decidido, y **Ejecutar** en una que ya aprobó pero que no se ha ejecutado. En ambos casos hace lo mismo: envía la acción a su sistema de tickets conectado, donde el agente publica la respuesta o la nota, o aplica el cambio. Aprobar es el momento en que el solicitante (o su equipo) puede verse afectado; hasta ese punto nada ha salido de KANAP.
- **Rechazar** no aplica la acción. La propuesta se descarta pero permanece en el registro de auditoría, de modo que siempre queda constancia de lo que el agente sugirió y de que usted lo rechazó. Rechazar una sola propuesta surte efecto de inmediato.

Si una propuesta está actualmente **bloqueada** —por ejemplo, si una comprobación de frescura o de seguridad ya no se cumple, o si el sistema de tickets no acepta el cambio en este momento—, su botón se desactiva y el motivo aparece en la información sobre herramientas del botón. La propuesta permanece visible para que pueda ver por qué no puede continuar.

**Aprobar todo** y **Rechazar todo** aparecen en un grupo de ticket cuando hay más de un elemento sobre el que actuar, de modo que puede despachar un ticket completo en un solo paso. **Rechazar todo** abre un breve diálogo que confirma cuántas propuestas se rechazarán y ofrece una nota opcional para el registro de auditoría. Las propuestas se aprueban automáticamente por tipo de acción solo después de haber capturado suficientes decisiones suyas para promover ese tipo de acción de **Preguntar primero** a **Automático** en la [Configuración](agents-workspace.md) del agente; hasta entonces, y siempre para el trabajo sensible, todas las propuestas pasan por esta cola.

---

## Acciones terminales

Las propuestas de **Cerrar ticket** y **Resolver ticket** se marcan como **Terminal** en rojo, porque ponen fin al ticket y el solicitante ve el cambio de inmediato. Estas cuentan con una salvaguarda adicional.

Aprobar una propuesta terminal —por sí sola o como parte de un **Aprobar todo** en el que algún elemento sea terminal— abre una confirmación **Aplicar acción terminal**. Nombra la acción y el ticket exactos, advierte de que el solicitante verá el cambio de inmediato, enumera todos los elementos terminales en una aprobación masiva y le ofrece un campo de motivo para el registro. Usted confirma con **Aplicar de todos modos**. Se trata de una fricción deliberada: las respuestas y notas rutinarias se aplican con un solo clic, pero cerrar o resolver un ticket siempre le pide detenerse y confirmar.

---

## Leer las respuestas redactadas: la nota de respaldo

Cuando un agente redacta una **Respuesta al solicitante** o una **Nota interna**, normalmente fundamenta ese borrador en sus bibliotecas de [Base de conocimiento](knowledge.md) y cita las fuentes que utilizó. Ocasionalmente verá una pequeña leyenda **Síntesis de respaldo** en una propuesta de este tipo. Significa que el agente no pudo respaldar ese borrador concreto con fuentes citadas; por tanto, trátelo como una simple sugerencia y léalo con atención antes de aprobarlo, en lugar de confiar en él como verificado con fuentes.

La leyenda indica el motivo en términos sencillos, por ejemplo:

- **Error de síntesis** — algo salió mal al componer la respuesta fundamentada.
- **Síntesis desactivada** — la redacción fundamentada está desactivada en esta instancia.
- **Proyección por encima del límite del run** — componer la respuesta fundamentada habría superado el presupuesto de esa comprobación.
- **Fuga de contexto operativo bloqueada** — el borrador se retuvo porque corría el riesgo de exponer guía interna al solicitante.
- **Síntesis inválida o sin base** — el borrador no se pudo verificar frente a sus fuentes.

Lo importante que hay que saber es que **la ausencia de esta nota es el caso normal y saludable.** La mayoría de los borradores están fundamentados y no llevan ninguna leyenda. Y una respuesta puede, legítimamente, no tener fuentes citadas —un acuse de recibo administrativo o un escalado puramente interno no está pensado para redactarse a partir de su base de conocimiento— sin que ello active esta advertencia. Por eso, no interprete la ausencia de una nota de respaldo como un problema; significa que el borrador está debidamente fundamentado o que nunca debía estarlo. La nota solo aparece cuando el agente intentó fundamentar una respuesta y no pudo.

---

## Rastrear una propuesta hasta su comprobación

Cada grupo de ticket y cada fila de atención lleva un enlace **Traza**. Enlaza directamente con la entrada correspondiente de la cronología de [Actividad](agents-activity.md), donde puede seguir la comprobación completa que produjo la propuesta: qué examinó el agente, qué decidió y por qué. Úselo siempre que un borrador o una actualización le resulte sorprendente y quiera conocer el razonamiento que hay detrás. Para los administradores que necesiten el detalle de bajo nivel, Actividad también ofrece una vista opcional de diagnóstico de los pasos de procesamiento sin procesar.

---

## Consejos

- Trabaje de arriba abajo: despache **Requiere tu decisión** y luego eche un vistazo a **Requiere atención** por si algo no llegó al sistema de tickets. Las dos secciones centrales no requieren ninguna acción de su parte.
- Nada de lo que hay aquí ha llegado al solicitante hasta que usted lo apruebe. Leer un borrador, rastrearlo o dejarlo en la cola no cambia nada en el ticket.
- Rechace en lugar de ignorar. Una propuesta rechazada permanece en el registro de auditoría con su nota opcional, lo cual resulta mucho más útil después que una propuesta que simplemente caducó sin atender.
- La ausencia de una nota **Síntesis de respaldo** es una buena noticia, no información que falte. Dedique su lectura más atenta a los borradores que *sí* la llevan.
- Si un cambio aprobado acaba en **Requiere atención**, la leyenda en rojo y el enlace **Traza** le indican si fue el agente, una comprobación de seguridad o el sistema de tickets conectado lo que lo detuvo; corrija la causa subyacente en lugar de volver a aprobar a ciegas.
- La cola combinada en `/agents/approvals` es más rápida cuando ejecuta varios agentes; cambie a la pestaña **Aprobaciones** propia de un agente cuando quiera centrarse solo en ese.

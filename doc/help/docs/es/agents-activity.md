# Agentes IA — Actividad

Actividad es el historial de solo lectura de todo lo que sus agentes han hecho y de todo lo que usted ha decidido sobre su trabajo: las propuestas que redactaron, sus aprobaciones y rechazos, los cambios que realmente se enviaron a un ticket, los límites de seguridad que se activaron, las pausas, los cambios de configuración y los errores. Nada en esta página cambia un ticket ni un agente: existe para que pueda responder «qué pasó, cuándo y por qué» a posteriori, y para darle un registro documentado cuando un solicitante o un técnico se lo pida. La misma cronología aparece en una sección de actividad reciente en la [pestaña Monitor](agents-workspace.md) de un agente; esta página es la versión completa y filtrable de todos los agentes.

## Dónde encontrarlo

- Espacio de trabajo: **Agentes IA**
- Ruta: **Agentes IA → Actividad**
- Ruta: `/agents/activity`
- Permiso: `ai_agents:reader` (solo consulta: cualquiera que pueda abrir Agentes IA puede leer la cronología)
- Requiere que la IA esté habilitada en la instancia. Esta página es de solo lectura: aquí no se aprueba, rechaza ni envía nada. Para actuar sobre una propuesta, use [Aprobaciones](agents-approvals.md).

---

## Filtros

La cronología muestra primero los eventos más recientes. Dos controles la acotan:

- **Número de ticket** — escriba un número de ticket y pulse **Buscar** (o Intro) para ver solo los eventos vinculados a ese único ticket. Es la forma más rápida de reconstruir la historia completa de un solo ticket: cada comprobación, borrador, decisión y cambio, en orden. Borre el campo y vuelva a buscar para regresar al listado completo.
- **Chips de tipo** — seis conmutadores en la parte superior: **Propuesta**, **Decisión**, **Ejecución**, **Configuración**, **Pausa** y **Error**. Haga clic en uno para mostrar solo ese tipo de evento; vuelva a hacer clic para desactivarlo. Es una forma rápida de responder a preguntas como «¿qué envió realmente el agente?» (Ejecución) o «¿qué hemos estado rechazando?» (Decisión).

La búsqueda por ticket y el chip de tipo se combinan, de modo que puede ver, por ejemplo, solo los errores del ticket #482.

---

## Leer una entrada de la cronología

Cada entrada es una cosa que ocurrió y lleva suficiente contexto para entenderla de un vistazo:

- Un **chip de tipo**: a cuál de las seis categorías anteriores pertenece el evento.
- Un **chip de tipo de acción** (cuando el evento trata de un tipo concreto de trabajo sobre el ticket): **Nota interna**, **Respuesta al solicitante**, **Actualización de clasificación**, **Actualización de estado**, **Asignación** o **Participantes**.
- Un **punto de estado** con una etiqueta en lenguaje claro (por ejemplo «Esperando aprobación», «Hecho», «Rechazado», «Requiere atención») que describe en qué situación se encuentra ese elemento.
- El **nombre del agente** y el **ticket** al que se refiere (mostrado como `#N`).
- Un **título de evento** (por ejemplo «Propuesta creada» o «Comprobación de tickets completada»).
- Una **vista previa de una línea** del contenido —la primera línea de un mensaje redactado, un cambio de campo o el motivo—, de modo que a menudo no necesita expandir nada.
- Una **marca de tiempo**, además de **Mostrar detalles** y, cuando hay una comprobación detrás del evento, **Traza**.

### Qué significan los eventos

El catálogo cubre todo el ciclo de vida del trabajo de los agentes. Agrupado por el chip de tipo al que corresponde:

- **Propuesta** — el agente redactó algo para revisión: se creó una respuesta, una nota o una actualización de ticket que espera una decisión.
- **Decisión** — una propuesta fue **aprobada** o **rechazada** (por una persona o automáticamente, una vez que ese tipo de acción funciona por su cuenta).
- **Ejecución** — un cambio se envió realmente al ticket, o una ejecución **falló**. Las ejecuciones automáticas y sus fallos también aparecen aquí.
- **Configuración** — alguien cambió el funcionamiento de un agente: se actualizó su **configuración de vigilancia** o su **configuración** general, un tipo de acción se pasó a **automático** o se **desactivó** (o se **degradó** para volver a preguntar primero), o se **eliminó un agente**.
- **Pausa** — se **activó** o **levantó** una **pausa de emergencia**, o se **pausó la vigilancia de un ticket** porque había una pausa en vigor.
- **Error** — algo salió mal que usted debería conocer: una **comprobación falló**, un solo **ticket no pudo procesarse**, o una ejecución automática falló. Los errores también aparecen cuando se alcanza un límite de seguridad —un **límite de seguridad diario** o un **límite de seguridad por ejecución**—, lo cual no es un fallo sino una parada deliberada. Las finalizaciones rutinarias como **Comprobación de tickets completada** también aparecen aquí, para que pueda confirmar que el agente está vigilando incluso en un día tranquilo.

No necesita memorizarlos: los títulos de los eventos están escritos en lenguaje claro y los chips de tipo le permiten filtrar hasta los que le interesan.

---

## Mostrar detalles

**Mostrar detalles** expande una entrada mostrando toda la evidencia que hay detrás. Según el evento, puede ver:

- El **Mensaje propuesto** completo: el texto íntegro que redactó el agente, no solo la vista previa de una línea.
- **Cambios de campo**, escritos como «Campo: de → a» (por ejemplo «Estado: Asignado → Pendiente»), de modo que un cambio de clasificación, estado, asignación o participante sea legible sin abrir el ticket.
- El **Motivo**: la breve justificación del agente para la propuesta.
- La **Nota del revisor**: la nota registrada cuando se decidió la propuesta.
- Una línea **«{n} fuentes citadas»**: cuántos de los resultados de su [biblioteca de conocimiento](knowledge.md) respaldaron la respuesta redactada. Es la señal honesta de si la respuesta se apoya en sus propias fuentes; una respuesta con fuentes citadas es una que el agente podría defender. Su ausencia en una respuesta administrativa o de procedimiento es normal y no significa que algo haya fallado; para ver cómo se refleja esto durante la revisión, consulte [Aprobaciones](agents-approvals.md).

---

## Traza técnica

El botón **Traza** abre el diálogo **Traza técnica**. Es una vista de diagnóstico opcional pensada para administradores que investigan una comprobación concreta; nunca la necesita para la revisión diaria, y todo lo que un solicitante o técnico querría ya está en **Mostrar detalles**.

Reconstruye cómo se desarrolló una única comprobación:

- Los **pasos** numerados que siguió el agente, cada uno con su propio estado.
- Las **llamadas a herramientas** que realizó, con el tiempo que tardó cada una: útil cuando una comprobación fue lenta o superó el tiempo de espera.
- Las **fuentes** que recopiló, mostradas como un breve resumen más el tipo de origen del que proceden.

Un conmutador **Mostrar traza sin procesar** revela el registro subyacente legible por máquina para el raro caso en que necesite el detalle exacto; déjelo contraído en caso contrario.

El mismo botón **Traza** aparece en [Aprobaciones](agents-approvals.md); seguirlo allí le lleva directamente a este diálogo para la comprobación que hay detrás de una propuesta, que es la forma habitual de llegar aquí durante la revisión.

---

## Consejos

- Buscar por **número de ticket** es la forma más rápida de entregar a alguien la historia completa y ordenada de un ticket —propuesta, decisión y qué se envió— sin tener que navegar por el propio ticket.
- Recurra al filtro **Ejecución** para ver solo lo que realmente salió al exterior. Las propuestas y las decisiones son intenciones; las ejecuciones son los cambios que un solicitante o técnico puede ver.
- Una entrada de **límite de seguridad alcanzado** bajo Error es el sistema funcionando según lo previsto, no un fallo. Si un agente se quedó en silencio el resto del día, normalmente es por esto; suba sus límites diarios en la [Configuración](agents-workspace.md) del agente si el límite es demasiado estricto para su volumen.
- Use **Traza** solo cuando esté investigando una comprobación lenta o fallida; para «qué dijo y por qué lo aprobamos», **Mostrar detalles** ya tiene la respuesta.
- Atajo para confirmar que un agente sigue activo en un día flojo: filtre por **Error** y busque entradas de **Comprobación de tickets completada**; el agente está vigilando aunque no proponga nada.
- Esta página nunca cambia nada, por lo que es seguro dar acceso de solo lectura (`ai_agents:reader`) a cualquiera que necesite auditar el comportamiento de los agentes sin poder actuar sobre él.

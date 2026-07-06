# Agentes IA — Vista general

Los agentes IA son ayudantes automatizados que vigilan su centro de servicios conectado y hacen la primera pasada en los tickets por usted: redactan una respuesta al solicitante, añaden una nota interna o proponen una actualización de la clasificación, el estado, la asignación o los participantes de un ticket, o un cierre/resolución. Esta página es el panel de la flota: el único lugar donde ver todos los agentes de un vistazo, cuánto trabajo espera su decisión, cómo rinde la flota y dónde accionar el freno de emergencia si algo va mal.

La idea importante que hay que recordar: el agente propone, usted dispone. Todo lo que un agente quiere enviar a un solicitante o escribir en un ticket se propone primero para su aprobación, y los límites de seguridad estrictos, los presupuestos, las comprobaciones de frescura y las pausas se aplican siempre, incluso después de que deje que un agente actúe por su cuenta. La configuración diaria de un solo agente se encuentra en su [Espacio del agente](agents-workspace.md); esta página es donde supervisa toda la flota.

## Dónde encontrarlo

- Espacio de trabajo: **Agentes IA**
- Ruta: **Agentes IA → Vista general**
- Ruta: `/agents`
- Permiso: `ai_agents:reader` para ver la sección. Los controles de creación, pausa de emergencia y eliminación descritos a continuación requieren el nivel de administrador de Agentes IA (`ai_agents:admin`); el administrador de configuración de Plaid (`ai_settings:admin`) también los desbloquea.
- Indicador de funcionalidad: toda la sección de Agentes IA requiere que la IA esté habilitada en la instancia. Si la IA está desactivada, la sección no está disponible.

---

## Conceptos, en un minuto

Algunas ideas se repiten en todas las páginas de esta sección. Apréndalas una vez aquí.

- **Qué vigila un agente.** Cada agente apunta a su sistema de tickets conectado (hoy es GLPI, configurado en **Administración → Integraciones** — consulte [la conexión con GLPI](integrations.md)). En las pantallas del agente se le denomina de forma genérica el sistema de tickets conectado o la conexión.
- **Sobre qué actúa un agente.** Los tickets. El trabajo que un agente puede proponer es una respuesta al solicitante, una nota interna, un cambio de clasificación, un cambio de estado (incluido cierre/resolución), un cambio de asignación y añadir o quitar participantes.
- **Preguntar primero vs. automático.** Todo tipo de acción empieza en **Preguntar primero**: el agente redacta el cambio y este permanece en su cola de aprobaciones hasta que lo aprueba o lo rechaza. Una vez que un agente ha acumulado suficiente historial en un tipo de acción concreto, un administrador puede promover solo ese tipo de acción a **Automático** para que se aplique sin esperar. La promoción es por tipo de acción, y los límites de seguridad de abajo nunca dejan de aplicarse.
- **Vigilancia vs. solo prueba.** Un agente **en vigilancia** comprueba por su cuenta el sistema de tickets conectado en busca de tickets coincidentes, aproximadamente cada cinco minutos. Un agente que no está en vigilancia solo se ejecuta cuando lo prueba manualmente en un único ticket desde su [espacio](agents-workspace.md); nada ocurre de forma automática. Los agentes nuevos siempre empiezan en modo solo prueba.
- **La seguridad siempre se aplica.** Los topes por comprobación, los presupuestos por ejecución y diarios, las comprobaciones de frescura (qué hacer si el ticket cambió después de que el agente redactara su trabajo) y las pausas se aplican tanto si un tipo de acción es preguntar primero como automático. Siempre puede detenerlo todo: consulte [Pausa de emergencia](#pausa-de-emergencia) más abajo.

Hoy solo el tipo de agente **Helpdesk** es utilizable de principio a fin. Otros tipos pueden aparecer en la lista de tipos de agente, pero no están listos para ejecutarse: quédese con Helpdesk.

Otras dos superficies de IA se confunden fácilmente con los agentes, pero son cosas distintas: [Plaid](ai-assistant.md) es el asistente de chat interactivo que maneja usted mismo, y [Configuración de Plaid](ai-settings.md) es donde se configura el proveedor de IA compartido.

---

## El panel de la flota

En la parte superior hay cinco cifras agrupadas, agregadas de todos los agentes helpdesk del espacio de trabajo, no las cifras de un solo agente:

- **Aprobaciones pendientes** — cuántas propuestas de toda la flota esperan ahora mismo una decisión humana. Es la misma cifra que alimenta el indicador de la barra lateral.
- **Acciones hoy** — cuántas propuestas se ejecutaron realmente hoy (aprobadas y aplicadas, o aplicadas automáticamente).
- **Aceptación** — la proporción de propuestas decididas que se aprobaron en lugar de rechazarse. Muestra **Datos insuficientes** hasta que haya suficiente historial de decisiones para ser significativa.
- **Descartadas** — la proporción de propuestas revisadas por una persona que se apartaron en lugar de aprobarse o rechazarse. Un descarte no penaliza al agente; por eso un valor persistentemente alto suele apuntar a un problema de segmentación —el agente está recogiendo tickets que no debería gestionar— más que a una mala calidad de las respuestas; corríjalo en la configuración del agente. También muestra **Datos insuficientes** hasta que haya suficiente historial de revisión.
- **Coste por ticket** — el coste estimado de IA por ticket gestionado, en EUR. También muestra **Datos insuficientes** hasta que haya historial.

Considere estas cifras como el estado de salud de la flota, no como la contabilidad por agente. Para las cifras de un solo agente, abra su espacio y use la pestaña **Rendimiento**.

---

## Las tarjetas de la flota

Debajo del panel, la sección **Flota** muestra una tarjeta por agente. Cada tarjeta lleva el **nombre** y la **descripción** del agente (o **Sin descripción.** si no se definió ninguna), un estado en lenguaje claro, una fila de fichas y —para un agente en vigilancia— una franja de cifras en vivo.

**El estado** (arriba a la derecha de la tarjeta) le indica lo que el agente está haciendo ahora mismo:

- **No iniciado** — creado pero nunca ejecutado. Aquí es donde empieza cada agente nuevo.
- **Desactivado** — deshabilitado; no vigilará ni actuará.
- **Archivado** — retirado del uso activo.
- **Prueba** — habilitado pero sin vigilancia. Solo se ejecuta cuando lo prueba manualmente en un único ticket.
- **Vigilancia — con aprobación** — vigila por su cuenta, pero todo tipo de acción sigue dirigiéndose a usted para su aprobación.
- **Vigilancia — parcialmente automática** — vigila, con al menos un tipo de acción promovido para ejecutarse sin aprobación. El resto sigue preguntando primero.
- **Pausado** — retenido por una pausa de emergencia (de todo el espacio de trabajo o solo de este agente). Las comprobaciones y las escrituras pendientes quedan congeladas hasta que se levanta la pausa.

**Las fichas** resumen el agente de un vistazo:

- **Tipo** — el tipo de agente, p. ej. **Helpdesk**.
- **Entorno** — a qué entorno de conexión apunta: **Producción**, **Preproducción**, **Entorno de pruebas**, **Laboratorio** o **Simulación**. Esta es su señal de si el agente está tocando tickets reales.
- **N pendientes** — propuestas de este agente que esperan su decisión (resaltadas cuando son más de cero).
- **N fallidos** — tickets de este agente que se atascaron y necesitan revisión (resaltados cuando son más de cero). Aparecen como **Requiere atención** en la cola diaria.
- **N automático(s)** o **Preguntar primero** — bien el número de tipos de acción promovidos a automático, bien **Preguntar primero** cuando no se ha promovido nada.

**Cuando un agente está en vigilancia**, aparecen cuatro cifras en la tarjeta:

- **Última comprobación** — el resultado de la comprobación automática más reciente.
- **Alcance** — **Todos los tickets** o **Tickets filtrados**, según si el agente está restringido a una entidad o categoría concreta.
- **Ejecuciones hoy** — cuántas veces se ha ejecutado hasta ahora hoy, frente a su tope diario de ejecuciones.
- **Actualizado** — la hora de su última comprobación.

Al hacer clic en cualquier parte de una tarjeta se abre el [espacio](agents-workspace.md) de ese agente, donde lo monitoriza, revisa sus aprobaciones, consulta su rendimiento y cambia su configuración.

Los administradores también ven un pequeño icono de papelera en las tarjetas de los agentes personalizados que crearon: elimina el agente junto con su cola y su historial de vigilancia (los tickets de su sistema de tickets nunca se ven afectados, y esto no se puede deshacer). El agente helpdesk integrado no tiene control de eliminación.

---

## Crear un agente

Los administradores obtienen una tarjeta **Nuevo agente** al final de la cuadrícula de la flota. Abre un asistente de cinco pasos que siempre produce un agente helpdesk a partir de una plantilla inicial segura:

1. **Tipo** — dé al agente un **Nombre** y una **Descripción**. El **Tipo de agente** está fijado en **Helpdesk**.
2. **Conexión** — elija el sistema de tickets con el que trabaja (**GLPI**). Un enlace **Gestionar integraciones** lleva a **Administración → Integraciones** si la conexión aún no está configurada.
3. **Vigilancia** — decida si debe vigilar por su cuenta con el conmutador **Vigilar nuevos tickets** y luego elija qué tickets busca. Los preajustes (**Tickets nuevos**, **Todos abiertos**, **Gestionados por este agente**) le dan un punto de partida; el generador de filtros lo acota aún más, con todos los filtros combinados y sus valores tomados del sistema de tickets conectado.
4. **Límites** — el marco de seguridad. Cubre la **Prioridad del agente** y **Revisar cada (horas)** (con qué frecuencia vuelve al mismo ticket), la gestión de **Colisión de ticket** cuando otro agente ya está en un ticket, **Tickets máximos por comprobación** y **Solicitudes máximas al proveedor** por comprobación, la **Ventana de aprobación (horas)** (cuánto tiempo permanecen abiertas las propuestas de cada comprobación antes de expirar —todas expiran juntas—), el comportamiento **Si el ticket cambió** (revisar de nuevo, cancelar o aplicar igualmente) y los topes por ejecución y diarios de **Tokens**, **Coste** y **Ejecuciones**. La plantilla incluye valores predeterminados razonables; el significado completo de cada campo está documentado en la pestaña Configuración del [Espacio del agente](agents-workspace.md).
5. **Revisión** — un resumen de todo lo anterior.

Los agentes nuevos siempre se crean como **No iniciado**, y usted aterriza en su pestaña **Configuración**. El camino recomendado es probar el agente primero en un ticket real y luego activar la vigilancia una vez que confíe en su salida.

---

## Pausa de emergencia

Si algo parece ir mal en general —respuestas inesperadas que se envían, una mala configuración, un incidente—, los administradores pueden congelarlo todo de una vez con **Pausar todos los agentes**. Se le pide un motivo (que pasa a formar parte del registro de auditoría), y a continuación un banner persistente muestra **Pausa de emergencia activa: {reason}** en toda la sección. Mientras está activa, las comprobaciones de todos los agentes y cualquier escritura pendiente quedan retenidas para todo el espacio de trabajo. Haga clic en **Levantar pausa** en el banner para reanudar.

Este freno de todo el espacio de trabajo es deliberadamente contundente. Para congelar un único agente que se comporta mal sin tocar el resto de la flota, use en su lugar la pausa por agente en la pestaña **Monitor** de ese agente: consulte el [Espacio del agente](agents-workspace.md).

---

## Trabajar con la flota en el día a día

La vista general es donde usted supervisa; dos páginas dedicadas son donde ocurre el trabajo diario real:

- [Aprobaciones](agents-approvals.md) es la cola de revisión: respuestas, notas y actualizaciones de tickets propuestas que esperan su decisión, agrupadas por ticket.
- [Actividad](agents-activity.md) es la cronología de auditoría de solo lectura de cada propuesta, decisión, ejecución, pausa y error.

La guía de fondo reutilizable que quiere que varios agentes compartan vive en la página [Contexto compartido](agents-shared-context.md). Tenga en cuenta que el contexto compartido determina cómo interpretan los agentes los tickets, pero nunca se cita en una respuesta: las fuentes que un agente realmente cita provienen de sus [Bibliotecas de conocimiento](knowledge.md).

---

## Consejos

- **Lea la ficha de entorno antes de confiar en una cifra.** Un agente de **Producción** está tocando tickets reales y solicitantes reales; **Entorno de pruebas**, **Laboratorio** y **Simulación** son seguros para experimentar. Cuando ponga en marcha un agente nuevo, manténgalo apartado de los tickets de producción hasta que su salida se vea correcta.
- **Un recuento creciente de fallidos es su alerta temprana.** La ficha **N fallidos** muestra los tickets que se atascaron. Abra el agente y despeje los elementos **Requiere atención** antes de que se acumulen: normalmente apuntan a un problema de conexión o a un ticket que cambió bajo el agente.
- **Pruebe antes de vigilar.** Un agente creado por el asistente está intencionadamente en **No iniciado**. Ejecútelo primero manualmente en un puñado de tickets representativos desde su espacio; active la vigilancia solo cuando esté satisfecho con lo que redacta.
- **El modo automático se gana y es reversible.** Promover un tipo de acción a automático no elimina ninguna barrera de protección: los presupuestos diarios y por ejecución, las comprobaciones de frescura y las pausas siguen aplicándose, y una aceptación que decaiga hará que el tipo de acción vuelva a preguntar primero.
- **Prefiera la pausa por agente.** Recurra a **Pausar todos los agentes** solo ante un problema genuino de toda la flota. Para un único agente ruidoso, la pausa por agente en su pestaña Monitor mantiene el resto de su flota funcionando.

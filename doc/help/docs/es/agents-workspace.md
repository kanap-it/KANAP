# Agentes IA — Espacio del agente

El espacio del agente es donde vive un único agente: observa lo que hace, revisa sus propuestas, juzga su rendimiento y —si es administrador— configura cada detalle de su funcionamiento. Es la superficie más profunda del área de Agentes IA. Todo lo relativo a un agente que no sea un control aplicable a toda la flota está aquí, repartido en cuatro pestañas.

Abra un agente haciendo clic en su tarjeta en [Agentes IA — Vista general](agents-overview.md). El espacio siempre se abre en **Monitor**; puede enlazar directamente a cualquier pestaña, y los enlaces desde otras partes del producto (por ejemplo, el botón **Revisar** de **Rendimiento**) le llevan a la correcta.

## Dónde encontrarlo

- **Espacio de trabajo:** Agentes IA
- **Ruta:** **Agentes IA → Vista general →** abra la tarjeta de un agente
- **Ruta URL:** `/agents/:agentKey`
- **Permiso:** la visualización requiere el rol Lector de Agentes IA (`ai_agents:reader`). La pestaña **Configuración** solo aparece para el nivel Administrador de Agentes IA (`ai_agents:admin`); el administrador de Configuración de IA (`ai_settings:admin`) también la desbloquea, junto con los controles **Iniciar agente**, **Desactivar** y **Pausar agente** de **Monitor**.
- **Disponibilidad:** toda la sección Agentes IA requiere que la IA esté habilitada en la instancia. Si abre un enlace a un agente que no existe en su espacio de trabajo, verá **Agente no encontrado** —«Este agente no está disponible en el espacio actual.»— con una forma de volver a la flota.

Las pestañas son **Monitor**, **Aprobaciones**, **Rendimiento** y **Configuración**. Los lectores ven las tres primeras; solo los administradores ven **Configuración**.

---

## Monitor

Monitor es el panel de estado en vivo de este agente concreto. Se actualiza a medida que el trabajo avanza, por lo que es la pestaña que conviene mantener abierta cuando quiere vigilar la situación.

### Estado

La tarjeta **Estado** resume el modo actual del agente e incorpora sus controles de ejecución (solo administradores):

- **Iniciar agente** cambia un agente no iniciado o desactivado a activado, de modo que empieza a vigilar.
- **Desactivar** detiene la vigilancia de un agente activado. Conserva su configuración e historial; puede volver a iniciarlo más tarde.
- **Pausar agente** es el freno de emergencia. Pide un motivo y luego retiene las comprobaciones de este agente y cualquier escritura pendiente hasta que la levante. Los demás agentes siguen funcionando. Cuando hay una pausa activa, verá aquí **Levantar pausa**. Una pausa establecida para todo el espacio de trabajo muestra en su lugar **En pausa para todos los agentes** y le lleva a la vista general de la flota para gestionarla; no puede levantar una pausa de todo el espacio desde un único agente.
- **Comprobar ahora** ejecuta una comprobación de inmediato en lugar de esperar a la siguiente programada. Está deshabilitado mientras ya se está ejecutando una comprobación o mientras el agente está en pausa.

Bajo los controles, cuatro fichas de solo lectura le indican la situación:

- **Ciclo de vida** — el estado general del agente en términos sencillos: **No iniciado**, **Desactivado**, **Prueba**, **Pausado**, **Archivado** o, cuando está activo, **Vigilancia — con aprobación** / **Vigilancia — parcialmente automática** (esta última cuando al menos un tipo de acción se ha promovido a automático).
- **Vigilancia** — **Todos los tickets**, **Filtrado** (cuando una categoría o entidad restringe el alcance) o **Desactivado**.
- **Última comprobación** — el resultado de la comprobación más reciente.
- **Próxima comprobación** — **Cada 5 minutos** mientras el agente vigila; de lo contrario, **Sin definir**.

### Cola

La tarjeta **Cola** contabiliza el trabajo que el agente tiene actualmente en espera:

- **En espera** — tickets cuyas propuestas esperan su aprobación.
- **En curso** — tickets en los que el agente está trabajando activamente. Cada ticket en curso también aparece debajo con un indicador de progreso y su estado, para que vea exactamente qué se está moviendo.
- **Fallidos** — tickets que dieron error o acabaron en **Requiere atención** y no se reintentarán por sí solos.
- **Aprobaciones pendientes** — el número total de propuestas individuales en todos los tickets en espera (un mismo ticket puede llevar varias).

### Límites

La tarjeta **Límites** muestra el consumo de hoy frente a los topes de seguridad definidos en la pestaña **Configuración**: **Ejecuciones hoy**, **Tokens hoy** y **Coste hoy** (en EUR), cada uno como *usado / tope*. Son techos estrictos: cuando se alcanza un tope, el agente se detiene por el resto del día pase lo que pase, por lo que esta tarjeta es donde notará que un agente está a punto de quedarse en silencio.

### Probar en un ticket

**Probar en un ticket** ejecuta el agente una vez sobre un único ticket que usted indica: la forma más rápida de ver cómo se comporta antes de dejarlo vigilar por su cuenta, o de comprobar su razonamiento en un caso concreto. Escriba un número de ticket (por ejemplo, `64`) y pulse **Ejecutar prueba**. El agente hace una pasada completa solo sobre ese ticket; todo lo que proponga aparece en la pestaña **Aprobaciones** para su revisión, como cualquier otro trabajo. No se envía nada al solicitante sin aprobación. Esto funciona incluso mientras el agente no está iniciado, lo que la convierte en la compañera natural de la etapa **No iniciado** de un agente nuevo.

### Actividad reciente

La parte inferior de Monitor incorpora una cronología en vivo y de solo lectura de las propuestas, decisiones, ejecuciones, pausas y errores de este agente. Es el mismo flujo que la página completa de [Actividad](agents-activity.md), ya filtrado a este agente. Cada entrada puede abrir una vista de diagnóstico opcional de **Traza técnica** para los administradores que quieran el detalle paso a paso que hay detrás de una comprobación.

---

## Aprobaciones

La pestaña **Aprobaciones** es la cola de revisión —respuestas, notas y cambios de tickets propuestos que esperan su decisión— acotada solo a este agente. Se comporta exactamente igual que la cola independiente, incluido aprobar o rechazar en bloque y la confirmación de acción terminal. Consulte [Aprobaciones](agents-approvals.md) para la explicación completa de cómo funciona la cola; aquí no cambia nada, salvo que solo ve los elementos de este agente.

---

## Rendimiento

Rendimiento le indica si el agente se está ganando más autonomía. La fila de cifras principales cubre, para este agente:

- **Aceptación** — la proporción de sus propuestas que usted aprobó. Es la cifra que más influye en si un tipo de acción puede pasar a automático.
- **Descartadas** — la proporción de propuestas revisadas de este agente que usted apartó en lugar de aprobar o rechazar. Un descarte no penaliza al agente, por lo que esta cifra queda al margen de la aceptación. Lea un valor persistentemente alto como un problema de segmentación —el agente está recogiendo tickets que no debería gestionar— y corríjalo en **Configuración → Segmentación**, en lugar de tratarlo como un problema de calidad de las respuestas.
- **Latencia de aprobación** — el tiempo habitual, en minutos, entre la aparición de una propuesta y la decisión de alguien sobre ella. Una cifra en aumento suele significar que la cola necesita más atención de los revisores, no que el agente lo esté haciendo peor.
- **Tasa de conocimiento** — con qué frecuencia sus respuestas se respaldaron con sus fuentes de conocimiento.
- **Coste por ticket** — gasto medio por ticket gestionado, en EUR.
- **Ejecuciones por ticket** — cuántas comprobaciones hicieron falta, de media, para resolver un ticket.

Debajo, una franja de **Tendencias** de 14 días muestra el volumen propuesto frente al ejecutado por día, para que vea de un vistazo cómo el agente va cogiendo ritmo (o un pico).

La **Escala de autonomía** enumera cada tipo de acción del que el agente tiene datos, con cuántas decisiones revisadas ha capturado frente al número necesario antes de poder revisar el modo **Automático**. Cuando un tipo de acción tiene evidencia suficiente, use **Revisar** para saltar a la sección **Autonomía** de **Configuración**, donde realmente se realiza la promoción.

---

## Configuración

La pestaña **Configuración** es solo para administradores y reúne todos los ajustes de configuración del agente. Se **guarda automáticamente**: no hay botones de guardar, y cada sección muestra un pequeño indicador **Guardando…** / **Guardado** en su encabezado a medida que se escriben sus ediciones. Las ediciones se aplican en el sitio, por lo que la página no se recarga ni pierde su posición mientras trabaja.

### Objetivo y capacidades

Esta es la persona del agente: quién es y cómo escribe:

- **Nombre** y **Estado**. El estado controla la disponibilidad: **No iniciado**, **Activado**, **Desactivado** o **Archivado**. (Archivar es la forma deliberada de retirar un agente.)
- **Descripción** — texto libre para su propio equipo.
- **Misión** — la función del agente en una o dos frases.
- **Instrucciones** — una instrucción por línea; cada línea se trata como una regla independiente.
- **Estilo de salida** — el tono con el que escribe el agente (por ejemplo, *claro y conciso*).
- **Idioma de respuesta** — el idioma de las respuestas dirigidas al solicitante: **Idioma del ticket** (coincide con el idioma en que esté escrito el ticket), **Francés**, **Inglés**, **Alemán** o **Español**.
- **Guía de escalada** — cuándo y cómo debe el agente pasar un ticket a una persona en lugar de intentar resolverlo.
- **Contexto compartido** — active **Usar contexto compartido** y elija un perfil para añadir a este agente un contexto reutilizable sobre su entorno, o use **+ Nuevo perfil** para crear uno al momento. Debajo se muestra una vista previa de las líneas del perfil seleccionado. El contexto compartido determina cómo interpreta el agente los tickets y redacta las respuestas, pero nunca es una concesión de permisos y **no** es una fuente citable, a diferencia de las [bibliotecas de conocimiento](knowledge.md), cuyos resultados *sí* se citan en las respuestas. Gestione los perfiles por completo en la página [Contexto compartido](agents-shared-context.md).

Junto al editor de la persona está la vista previa de solo lectura del **Prompt efectivo**: exactamente lo que recibe el runtime del agente, compilado a partir de todo lo anterior más las propias reglas de la plataforma. Use el selector para inspeccionar cada etapa: **Planificador de acciones**, **Planificador** e **Intérprete** son las etapas donde el agente decide *qué hacer*; **Síntesis** es donde redacta la respuesta fundamentada en sus fuentes de conocimiento. La vista previa se actualiza después de cada guardado. Como indica la ayuda, **la guía no puede anular las reglas de seguridad**: nada de lo que escriba en la persona puede relajar los límites estrictos de la plataforma.

### Capacidades

Interruptores para qué tipos de cambio puede llegar a proponer el agente: **Notas internas**, **Respuestas al solicitante**, **Clasificación**, **Cambios de estado**, **Asignación** y **Participantes**. Desactivar uno elimina por completo ese tipo de acción: el agente no puede proponerlo ni puede aparecer en la escala de autonomía. Son el límite exterior; la sección **Autonomía** de abajo decide cuáles de los habilitados siguen preguntando primero.

### Segmentación

La segmentación decide qué tickets vigila el agente. El interruptor principal —**Vigilar nuevos tickets** (o **Vigilar tickets automáticamente** en un agente personalizado)— activa o desactiva la vigilancia. Los ajustes rápidos (**Tickets nuevos**, **Todos abiertos**, **Gestionados por este agente**) introducen un conjunto de filtros inicial; si ya tiene filtros, se le pregunta antes de sustituirlos.

El generador de filtros le permite combinar condiciones: todos los filtros se combinan entre sí, y los valores disponibles proceden directamente del sistema de tickets conectado. Una vista previa en vivo muestra el efecto práctico:

- **Coincidencias** — cuántos tickets encajan actualmente.
- **Muestra** — cuántos se inspeccionaron realmente para producir la estimación.
- **Solape** — tickets que otros agentes también coinciden, para que detecte a dos agentes disputándose el mismo trabajo.
- **Ejec./día** — el número esperado de comprobaciones por día en este alcance.

Aparece una nota cuando la vista previa está limitada por sus topes por comprobación: el número real de coincidencias puede ser mayor que el que muestra la vista previa.

### Ajustes operativos

Los controles de ritmo y presupuesto:

- **Prioridad del agente** — se usa junto con **Colisión de ticket** para decidir quién gestiona un ticket que dos agentes quieren.
- **Revisar cada (horas)** — cuánto espera el agente antes de volver a mirar un ticket que ya ha gestionado.
- **Colisión de ticket** — qué hacer cuando otro agente ya está en un ticket: **Diferir** (dejarlo en paz) o **Sustituir misma prioridad** (tomar el relevo de un agente de la misma prioridad).
- **Tickets máximos por comprobación** y **Solicitudes máximas al proveedor** — cuánto trabajo puede asumir una sola comprobación.
- **Ventana de aprobación (horas)** — cuánto tiempo permanece abierta cada propuesta de un ticket antes de expirar. Todas las propuestas de una misma comprobación comparten esta ventana, por lo que expiran juntas en lugar de por partes.
- **Si el ticket cambió** — qué hacer si el ticket avanzó entre la propuesta y su aprobación: **Revisar de nuevo**, **Cancelar** o **Aplicar igualmente**.
- **Tokens por ejecución** / **Coste por ejecución (EUR)** y **Ejecuciones por día** / **Tokens por día** / **Coste por día (EUR)** — los topes de gasto por comprobación y diarios. Las cifras diarias son los mismos topes que vigila en la tarjeta **Límites** de Monitor.

### Fuentes de conocimiento y web

De dónde saca el agente sus datos:

- **Buscar en el conocimiento de KANAP** — cuando está activado, el agente recurre a sus [bibliotecas de conocimiento](knowledge.md) y las cita en las respuestas. Con esto desactivado, el agente responde con el conocimiento propio del modelo (y de la web, si está activada).
- **Buscar en todas las bibliotecas disponibles**, o desactívelo para elegir **Bibliotecas** concretas: el agente busca entonces solo en esas, dentro de las que puede acceder. Los nombres de las bibliotecas provienen de la sección de Conocimiento.
- **Buscar en la web** — permite que el agente también consulte la web pública; el conocimiento de KANAP siempre tiene prioridad y los resultados web se citan. Este interruptor solo está disponible si la búsqueda web está habilitada para toda la plataforma. Cuando no lo está, el interruptor aparece deshabilitado y una nota le remite a su administrador; consulte [Configuración de Plaid / proveedor de IA](ai-settings.md).

### Autonomía

De forma predeterminada, cada tipo de acción **pregunta primero**: el agente propone y espera su decisión. En esta sección promueve un tipo de acción de **Preguntar primero** a **Automático**, tipo por tipo, una vez que se lo ha ganado. Cada fila muestra el modo actual y una línea de elegibilidad: decisiones capturadas, tasa de aceptación y días de actividad, cada uno frente a lo requerido. Cuando un tipo de acción aún no es elegible, la fila explica por qué (por ejemplo, no hay suficientes propuestas revisadas, o la aceptación está por debajo del umbral).

- **Activar** aparece cuando un tipo de acción es elegible. Abre una confirmación que resume la evidencia y le recuerda que las acciones automáticas siguen respetando los límites diarios y la pausa de emergencia, y vuelven a preguntar primero si la aceptación baja.
- **Anular** aparece cuando un tipo de acción no es elegible pero se permite anular. Requiere un motivo por escrito y advierte con claridad de que una anulación omite *solo* los umbrales de recomendación: los límites de seguridad estrictos, las comprobaciones de frescura, el soporte del proveedor, los presupuestos, las pausas y las restricciones de respuestas al solicitante siguen aplicándose.
- **Desactivar** devuelve cualquier tipo de acción automático a preguntar primero.

Sea cual sea el modo de un tipo de acción, los límites de seguridad estrictos de la plataforma, los presupuestos, las comprobaciones de frescura y las pausas siempre se aplican: automático nunca significa sin supervisión.

---

## Consejos

- **Use Probar en un ticket antes de activar.** Una ejecución de prueba le da propuestas reales que juzgar sin que el agente toque nada más. Es la forma honesta de ajustar una persona: ajuste, vuelva a probar, repita.
- **La tarjeta Límites es su luz de aviso temprano.** Un agente que de repente se queda en silencio suele haber alcanzado un tope diario; revise *Ejecuciones / Tokens / Coste hoy* en Monitor antes de dar por hecho que algo se rompió.
- **Lea el Prompt efectivo tras un cambio en la persona.** Es la verdad de fondo de lo que el agente recibe realmente, y deja claro cuándo una instrucción quedó como usted pretendía.
- **Aumente la autonomía de un tipo de acción cada vez.** Promueva primero los tipos de bajo riesgo (notas internas) y deje las respuestas al solicitante preguntando primero hasta que la aceptación sea alta de forma constante; la escala no le dejará pasar a automático sin la evidencia, pero usted marca el apetito.
- **Prefiera el contexto compartido para el trasfondo y las bibliotecas para los datos.** El contexto compartido matiza el criterio del agente pero nunca se cita; solo las bibliotecas de conocimiento (y, si está habilitada, la web) aparecen como fuentes en una respuesta.
- **Vigile el Solape en la vista previa de segmentación.** Un número de solape alto significa que dos agentes compiten por los mismos tickets; restrinja los filtros de un agente, o use **Prioridad del agente** y **Colisión de ticket** para decidir quién gana.

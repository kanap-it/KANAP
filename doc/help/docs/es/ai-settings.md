# Configuración de Plaid

El proveedor que configura en esta página es el modelo de IA predeterminado para todo su espacio de trabajo: alimenta tanto el [asistente de chat Plaid](ai-assistant.md) interactivo como los [Agentes IA](agents-overview.md) automatizados que clasifican los tickets. Por eso esta no es una pantalla exclusiva de chat: elegir un proveedor, activar el soporte multimodal o alcanzar un límite mensual afecta a los agentes tanto como al cuadro de chat. La página también controla qué superficies de IA están activadas, cuánto tiempo se conservan las conversaciones y qué claves permiten a los clientes MCP externos acceder a sus datos, y ofrece a los administradores una vista general del uso de todo el espacio de trabajo para vigilar el tráfico y el coste.

## Dónde encontrarlo

- Espacio de trabajo: **Administración**
- Ruta: **Administración → Plaid**
- Ruta: `/admin/ai`
- Permiso: `ai_settings:admin`
- Indicador de funcionalidad: requiere que la superficie de configuración de IA esté habilitada. Cuando está desactivada, la página muestra un aviso («La configuración de IA está deshabilitada para esta instancia») y no hay controles disponibles.

---

## Proveedor

La sección **Proveedor** elige qué modelo de lenguaje grande usa su espacio de trabajo. El modelo que establece aquí es con el que habla el asistente de chat Plaid *y* el que usa cada agente IA para leer tickets, planificar el trabajo y redactar respuestas: no hay una configuración de modelo aparte para los agentes.

### Origen del proveedor

Cuando el proveedor integrado se ofrece en su instancia, puede elegir entre:

- **Plaid AI - Built-in**: el servicio alojado de KANAP, con una cuota mensual de mensajes registrada por espacio de trabajo.
- **Your own provider**: use su propia clave API para **Anthropic**, **OpenAI**, **Ollama** o un endpoint **Custom** (compatible con OpenAI). Sin cuota más allá de la que imponga su propio proveedor.

Cuando la opción integrada no se ofrece (típico en despliegues locales), solo se muestra la configuración del proveedor personalizado.

### Built-in usage

Si selecciona el proveedor integrado, aparece una tarjeta **Built-in usage** con:

- Una barra de progreso de los **mensajes utilizados este mes** frente al límite por espacio de trabajo
- La fecha de **restablecimiento** de la cuota
- Un recordatorio de que cambiar a sus propias claves elimina el límite

La cuota integrada se comparte entre las solicitudes de chat y de MCP de este espacio de trabajo, y un «mensaje» se cuenta de la misma manera que en la [Vista general de uso](#vista-general-de-uso) de más abajo: una pregunta de chat *o* un ticket revisado por un agente. Dicho de otro modo, la actividad de los agentes consume la misma cuota mensual que el chat, por lo que una flota de agentes muy activa la agota más rápido.

### Configuración del proveedor personalizado

Seleccione **Your own provider** para mostrar:

- **Proveedor**: Anthropic, OpenAI, Ollama o Custom (compatible con OpenAI). Déjelo en **Ninguno** para borrar el ajuste.
- **Modelo**: el identificador exacto del modelo (por ejemplo, `claude-sonnet-4-20250514`, `gpt-4o` o `llama3`).
- **URL del endpoint**: se muestra solo para los proveedores Ollama y Custom. Cuando Ollama se ejecuta en el host mientras KANAP se ejecuta en Docker, use `http://host.docker.internal:<port>/v1` en lugar de `localhost`.
- **Clave API**: requerida cuando el proveedor la necesita. Las claves existentes se enmascaran; deje el campo en blanco para conservar el valor almacenado durante un guardado o una prueba. Si el almacenamiento de secretos no está configurado en la instancia, el campo lo indica.

Una vez configurado todo, haga clic en **Probar conexión** para ejecutar un ping sin coste contra el proveedor. El resultado aparece en una banda con el proveedor, el modelo y la latencia de ida y vuelta.

### LLM multimodal

El conmutador **LLM multimodal** controla si el modelo puede analizar imágenes. Cuando está activado, tanto el asistente de chat como los agentes IA pueden leer las imágenes adjuntas, sobre todo las **capturas de pantalla de los tickets** que los solicitantes pegan en un ticket y que los agentes usan luego como evidencia al redactar una respuesta. Actívelo solo si el modelo configurado admite realmente visión; desactívelo si el modelo es solo de texto, de lo contrario las solicitudes con imágenes fallarán. Los nuevos espacios de trabajo lo tienen activado de inicio.

### Chips de estado

El encabezado de la tarjeta Proveedor muestra tres indicadores de un vistazo:

- **Chat habilitado / Chat deshabilitado**: el conmutador maestro para el chat del usuario final
- **MCP habilitado / MCP deshabilitado**: si los clientes MCP externos pueden conectarse
- **Proveedor listo / Proveedor incompleto**: si la configuración del proveedor es válida y utilizable

Los errores de validación (clave API faltante, forma de endpoint incorrecta, modelo desconocido) aparecen en una advertencia encima del formulario bajo **Errores de validación del proveedor actual**, para que sepa exactamente qué corregir.

---

## Funcionalidades

La sección **Funcionalidades** activa o desactiva las superficies de IA opcionales:

- **Habilitar chat**: activa o desactiva el espacio de chat dentro de la app para los usuarios finales.
- **Habilitar MCP**: activa o desactiva la API MCP para los clientes externos.
- **Búsqueda web**: permite al asistente de chat Plaid buscar en la web. Requiere que la clave de búsqueda web a nivel de instancia esté configurada; sin ella, el conmutador está deshabilitado y un tooltip explica por qué. Al activarlo se ejecuta automáticamente una prueba de conectividad y se informa del resultado. Este conmutador se aplica **solo al asistente de chat**: los agentes IA tienen su propia configuración de búsqueda web independiente, en la [pestaña Configuración](agents-workspace.md) de cada agente, que se basa en la misma configuración a nivel de instancia.

---

## Retención

- **Retención de conversaciones (días)**: las conversaciones de chat y sus mensajes con una antigüedad superior a este valor pasan a ser elegibles para la limpieza automática. Déjelo vacío para conservarlas indefinidamente.

---

## Claves API MCP

La sección **Claves API MCP** genera claves de larga duración para que los asistentes externos y los IDE puedan comunicarse con KANAP a través del Model Context Protocol, usando los mismos datos que ve Plaid.

La tarjeta muestra un botón **Crear clave**, el límite de **Vida útil máxima de la clave (días)** y una tabla de claves existentes con **Etiqueta**, **Prefijo**, **Creada**, **Expira**, **Último uso** y **Estado** (**Activa** o **Revocada**).

### Crear una clave

1. Haga clic en **Crear clave**.
2. Introduzca una **Etiqueta** descriptiva (por ejemplo, «Cliente MCP de escritorio»).
3. Haga clic en **Crear**. KANAP genera un secreto de un solo uso.
4. Copie el secreto inmediatamente: se muestra una sola vez y no puede recuperarse más tarde.

El campo **Vida útil máxima de la clave (días)** limita cuánto tiempo puede vivir cualquier clave recién emitida, independientemente de lo que solicite la petición. Déjelo vacío para no tener límite de expiración.

### Revocar una clave

Haga clic en el icono de papelera de cualquier fila activa para revocar la clave. Las claves revocadas permanecen en la tabla con fines de auditoría, pero ya no pueden autenticarse.

---

## Vista general de uso

En la parte inferior de la página, la tarjeta **Vista general de uso** resume la actividad de IA de toda la organización. Como explica la tarjeta, un **mensaje** es una pregunta enviada a Plaid *o* un ticket revisado por un agente: la misma unidad que cuenta el volumen mensual incluido.

La fila superior de tarjetas de métricas cubre las conversaciones de chat:

- **Todas las conversaciones**: número total de conversaciones creadas alguna vez
- **Conversaciones activas (7d)** y **Conversaciones activas (30d)**: conversaciones actualizadas en los últimos 7 o 30 días
- **Usuarios activos (30d)**: usuarios únicos que han chateado en los últimos 30 días

Debajo, la tabla **Uso de tokens** desglosa dos ventanas, **Mes actual** y **Últimos 30 días**, en **Tokens de entrada**, **Tokens de salida**, **Tokens totales** y **Mensajes de usuario** (las preguntas de chat realizadas en cada ventana).

Si algún agente ha realizado trabajo, debajo aparece un bloque **Mensajes de los agentes (este mes)**. **Todos los agentes** muestra el recuento combinado de tickets revisados este mes en toda la flota, y una tarjeta por agente muestra el recuento propio de ese agente; el pie de cada tarjeta indica la cifra de los **Últimos 30 días** para el mismo alcance. Esta es la contraparte, a nivel de todo el espacio de trabajo, de las cifras por agente del [espacio del agente](agents-workspace.md): úsela para ver qué agentes hacen más trabajo y para contrastar el volumen de los agentes con el presupuesto de su proveedor.

Los totales de tokens resumen la entrada y la salida del modelo de cada ventana; el volumen de los agentes se registra por separado como los recuentos de mensajes del bloque **Mensajes de los agentes**, en lugar de desglosarse en su propia línea de tokens aquí.

---

## Consejos

- **Elija el modelo pensando en los agentes.** Como los agentes comparten este proveedor, un modelo más barato y solo de texto ahorra dinero en el chat, pero deja a sus agentes de triaje sin poder leer capturas de pantalla: decida teniendo en cuenta ambas tareas y combine un modelo con capacidad de visión con el conmutador **LLM multimodal** si los agentes van a gestionar tickets con muchas imágenes.
- **Pruebe antes de activar el chat.** El botón **Probar conexión** valida las credenciales sin escribir nada ni consumir cuota. Úselo antes de activar el chat para los usuarios finales o de poner en marcha un agente.
- **Rote las claves MCP.** Prefiera claves de corta duración para las estaciones de trabajo compartidas y use **Vida útil máxima de la clave (días)** para imponer un tope que ninguna petición pueda superar.
- **Vigile juntos los totales de tokens y los recuentos de agentes.** Un único mes con totales muy altos suele deberse a unas pocas conversaciones largas o a una carga de trabajo elevada de los agentes: el bloque **Mensajes de los agentes** le dice cuál de las dos, para que pueda animar a iniciar nuevos hilos de chat por tema o revisar la cadencia de comprobación de un agente.
- **Establezca una ventana de retención.** Conservar las conversaciones para siempre es conveniente hasta que la base de datos crece demasiado o una revisión de conformidad pregunta cuánto tiempo se conserva el contenido del chat: 90 o 180 días es un punto de partida habitual.
- **GLPI se configura en otro sitio.** La conexión de ticketing con la que trabajan sus agentes se configura en **Administración → Integraciones**, no aquí; consulte [Integraciones](integrations.md).

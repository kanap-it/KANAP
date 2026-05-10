# Plaid

Plaid es el asistente de chat integrado de KANAP. Está conectado a los mismos datos con los que ya trabaja — aplicaciones, activos, proyectos, solicitudes, tareas, contratos, documentos de la base de conocimiento y datos maestros — para que pueda hacer preguntas en lenguaje claro en lugar de hacer clic a través de varias pantallas para encontrar una respuesta.

Plaid no reemplaza al resto de la aplicación. Es una forma más rápida de resumir contexto, localizar registros, redactar texto o preparar cambios. Las operaciones sensibles siempre se muestran como vistas previas que debe aprobar antes de que se escriba nada de vuelta en KANAP.

## Dónde encontrarlo

- Espacio de trabajo: **Plaid** (navegación superior)
- Ruta: `/ai`
- Permiso: `ai_chat:reader` le permite abrir el espacio de trabajo del chat e iniciar conversaciones
- Indicador de funcionalidad: requiere que la superficie de chat esté habilitada en su instancia. Si está desactivada, el espacio de trabajo muestra un aviso en lugar de la interfaz del chat.

El espacio de trabajo también está disponible para administradores con `ai_chat:admin`, quienes pueden ver y moderar todo lo que hacen los usuarios habituales.

## Iniciar una conversación

Cuando abre Plaid por primera vez, llega a una pantalla de bienvenida con:

- Un breve eslogan ("Plaid is ready") y una descripción de lo que puede preguntar
- Una sección **Try asking** con prompts de ejemplo en los que puede hacer clic para enviar
- El compositor en la parte inferior, listo para aceptar su primer mensaje

Haga clic en cualquier sugerencia para enviarla directamente, o — para prompts que contienen un marcador `@` — colocar la sugerencia en el compositor para que pueda terminarla.

Escriba un mensaje y pulse **Enter** para enviarlo. **Shift+Enter** inserta una nueva línea. El botón de enviar está deshabilitado mientras no haya nada que enviar y se transforma en un botón rojo **Detener** mientras Plaid está respondiendo.

## La lista de conversaciones

La barra lateral izquierda lista sus conversaciones pasadas. Use el icono de menú en la parte superior izquierda del área del chat para contraerla o expandirla.

La lista contiene:

- Un botón **Nueva conversación** en la parte superior
- Un campo de búsqueda que aparece tan pronto como tiene al menos una conversación
- Conversaciones agrupadas por fecha: **Hoy**, **Ayer**, **Últimos 7 días**, **Más antiguas**

Cada fila muestra el título de la conversación (o **Sin título** cuando aún no se ha establecido ninguno). Pase el ratón o enfoque una fila para revelar:

- Un icono de lápiz — **Renombrar** la conversación. Haga doble clic en el título para hacer lo mismo.
- Un icono de papelera — **Archivar** la conversación. Las conversaciones archivadas desaparecen de la lista. Si archiva la conversación que tiene actualmente abierta, Plaid cambia a un nuevo chat vacío.

La búsqueda filtra la lista por título mientras escribe. El renombrado y el archivado se guardan inmediatamente.

## Escribir un mensaje

El compositor es el principal punto de control del espacio de trabajo. Admite:

- Texto multilínea hasta 10 filas visibles antes de hacer scroll
- Adjuntos de imágenes en línea (PNG, JPG, GIF, WEBP)
- Menciones `@` de registros de KANAP
- Un recordatorio de pista de teclado ("Enter para enviar · Shift+Enter para nueva línea")

### Adjuntar imágenes

Puede añadir imágenes de tres formas:

- Haga clic en el icono de clip y elija archivos de su ordenador
- Arrastre y suelte archivos de imagen sobre el compositor (una superposición de pista confirma el área de destino)
- Pegue una imagen directamente desde el portapapeles

Cada imagen pendiente aparece como una miniatura encima del texto. Haga clic en la pequeña **X** de una miniatura para eliminarla. Hay un límite de adjuntos por mensaje; una vez alcanzado, el clip se deshabilita hasta que elimine o envíe los adjuntos actuales.

Las imágenes se suben junto con su mensaje para que Plaid pueda describirlas, compararlas o extraer detalles.

### Mencionar registros con `@`

Escribir `@` abre el **selector de menciones** encima del compositor. Le permite hacer referencia a cualquier registro de KANAP al que tenga acceso, con dos modos complementarios:

- **Prefijo de tipo-token**: códigos cortos que se asignan a una única familia de entidades. Ejemplos:
  - `@T-5` — tarea con la referencia T-5
  - `@DOC` — documentos de conocimiento recientes
  - `@APP backup` — aplicaciones que coinciden con "backup"
  - `@PRJ`, `@REQ`, `@AST`, `@CONN`, `@INT`, `@LOC`, `@CTR`, `@CPX`, `@COMP`, `@CONT`, `@DEPT`, `@SUP`, `@BP`
- **Texto plano**: cualquier otra cosa (`@payroll`, `@server-2`) ejecuta una búsqueda entre tipos clasificada por relevancia.

Use las teclas de flecha para moverse por las sugerencias, **Enter** o **Tab** para confirmar, **Escape** para descartar el selector. Los resultados se agrupan por tipo de entidad (Conocimiento, Tareas, Proyectos, Aplicaciones, Activos, Contratos, etc.) para que pueda saber de un vistazo qué tipo de registro está a punto de insertar.

Cuando confirma una sugerencia, el compositor sigue mostrando una etiqueta legible (`@DOC-152`, `@SAP S/4HANA`). Cuando se envía el mensaje, cada mención se expande en un enlace real que Plaid puede seguir de vuelta al registro de origen.

### Editar o regenerar un mensaje

Pase el ratón sobre cualquiera de sus mensajes anteriores para obtener acciones a nivel de mensaje:

- **Copiar** — copia el texto del mensaje al portapapeles
- **Editar** — vuelve a abrir el mensaje en un editor en línea; al guardar se envía la nueva versión y se trunca todo lo que vino después (la conversación se vuelve a ejecutar desde ese punto)
- **Regenerar** (en respuestas del asistente) — pedir a Plaid que produzca otra respuesta al mismo prompt

Editar es la herramienta correcta cuando se da cuenta de que su pregunta anterior no estaba clara. Regenerar es la herramienta correcta cuando la pregunta era buena pero la respuesta no.

## Cómo responde Plaid

Plaid transmite su respuesta carácter por carácter. Mientras transmite:

- El compositor permanece utilizable para que pueda preparar un seguimiento
- El botón de enviar muestra un icono rojo de **Detener** — hacer clic en él cancela la respuesta en curso
- Aparece un pequeño indicador "Using tools…" cuando Plaid está buscando en KANAP, recuperando un documento o ejecutando otra llamada a herramienta
- El número y tipo de herramientas usadas se resumen bajo la respuesta una vez completada

Cuando el flujo termina, el foco vuelve al compositor para que pueda seguir moviendo la conversación sin alcanzar el ratón.

### Llamadas a herramientas

Plaid usa un pequeño conjunto de herramientas internas para responder preguntas: `Search all`, `Search knowledge`, `Get document`, `Get entity context` y unas pocas más. Cada llamada a herramienta aparece como una línea compacta bajo el mensaje ("used Search all · 8 results"). Normalmente no necesita leer los detalles de la herramienta, pero están ahí si quiere ver exactamente en qué registros se basó la respuesta.

## Artefactos y vistas previas

Algunas respuestas vienen con material adicional que no encaja naturalmente dentro del hilo del chat. KANAP los llama **artefactos**.

Casos comunes:

- Un bloque largo de texto o markdown que Plaid preparó para usted
- Una comparación lado a lado **Antes / Después** de un registro que Plaid quiere actualizar
- Un borrador de importación o conjunto de cambios que requiere su aprobación

Los artefactos se abren en un panel lateral a la derecha del espacio de trabajo. El panel puede alternarse haciendo clic en el botón de pestaña **Artefactos** en el borde derecho de la pantalla.

El panel se abre automáticamente cuando:

- Llega una vista previa larga durante una respuesta en streaming
- Una vista previa pendiente necesita su decisión (estas siempre abren el panel, ya que debe actuar sobre ellas)

Para vistas previas de cambios pendientes, el panel ofrece dos botones:

- **Aprobar** — confirma el cambio y permite a Plaid aplicarlo
- **Rechazar** — cancela el cambio. Plaid acusa el rechazo y continúa la conversación.

Nada que mute datos de KANAP se aplica silenciosamente. La vista previa es la puerta.

## Indicadores de uso

Encima del compositor, dos pequeños indicadores le ayudan a permanecer consciente del coste y los límites:

- **Uso integrado**: cuando su espacio de trabajo usa el proveedor IA integrado de Plaid (en lugar de su propia clave API), esto muestra cuántos mensajes quedan en el mes actual y la fecha en que se restablece la cuota. Cuando se alcanza el límite, el compositor se deshabilita y un texto de ayuda invita a los administradores a cambiar a un proveedor personalizado.
- **Uso de tokens**: una barra fina con contadores de tokens de entrada/salida para la conversación actual, además del tamaño de la última solicitud. Las conversaciones largas se vuelven más caras con el tiempo; la barra hace visible ese coste para que pueda decidir cuándo iniciar un hilo nuevo.

La barra de uso de tokens solo aparece una vez que la conversación tiene al menos un intercambio.

## Consejos

- **Use prefijos para mayor precisión**: `@T-`, `@DOC-`, `@PRJ-`, `@REQ-` se asignan directamente a referencias nativas de KANAP. Son la forma más rápida de apuntar Plaid a un registro específico y sobreviven al copiar y pegar porque parecen idénticos a lo que ve en otras partes de la aplicación.
- **Inicie una nueva conversación por tema**: mantener preguntas no relacionadas en conversaciones separadas hace que la ventana de contexto sea más pequeña, las respuestas más rápidas y la factura de tokens más baja. La lista de conversaciones se agrupa por fecha para que pueda volver a encontrarlas fácilmente.
- **Apruebe y rechace deliberadamente**: las vistas previas son lo único que se interpone entre Plaid y sus datos en vivo. Tómese el segundo extra para leer la diferencia antes de hacer clic en **Aprobar**.
- **Detenga en lugar de esperar**: si Plaid se va por el camino equivocado en medio del flujo, pulse el botón **Detener** en lugar de esperar a que termine. Ahorrará tokens y su mensaje de seguimiento puede corregir el rumbo.
- **Suelte imágenes directamente**: arrastrar una captura de pantalla al compositor es más rápido que el selector de archivos, y pegar desde el portapapeles también funciona. Úselo cuando describa un problema de la interfaz o pida a Plaid que lea un gráfico.

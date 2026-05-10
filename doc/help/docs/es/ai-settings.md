# Configuración de Plaid

Use la página de configuración de Plaid para configurar cómo se comporta el asistente de chat para su espacio de trabajo: con qué proveedor de IA habla, qué funcionalidades están activadas, cuánto tiempo se conservan las conversaciones y qué claves pueden conectar clientes MCP externos a sus datos. La página también ofrece a los administradores una visión general del uso para que pueda vigilar el tráfico y el coste.

## Dónde encontrarlo

- Espacio de trabajo: **Administración**
- Ruta: **Administración → Plaid**
- Ruta: `/admin/ai`
- Permiso: `ai_settings:admin`
- Indicador de funcionalidad: requiere que la superficie `ai_settings` esté habilitada. Cuando la superficie está desactivada, la página muestra un aviso ("La configuración de IA está deshabilitada para esta instancia") y no hay controles disponibles.

## Proveedor

La sección Proveedor es donde elige qué modelo de lenguaje grande debe usar Plaid.

### Origen del proveedor

Cuando el proveedor integrado se ofrece en su instancia, puede elegir entre:

- **Plaid AI - Integrado**: el servicio Plaid AI alojado por KANAP. Conveniente, con una cuota mensual de mensajes registrada por espacio de trabajo.
- **Su propio proveedor**: traiga su propia clave API para **Anthropic**, **OpenAI**, **Ollama** o un endpoint **personalizado** compatible con OpenAI. Sin cuota más allá de la que aplique su proveedor.

Cuando la opción integrada no se ofrece (típico en despliegues locales), solo se muestra la configuración del proveedor personalizado.

### Uso integrado

Si selecciona el proveedor integrado, aparece una tarjeta de uso con:

- Una barra de progreso de mensajes utilizados este mes contra el límite por espacio de trabajo
- La fecha de restablecimiento de la cuota
- Un breve recordatorio de que cambiar a sus propias claves elimina el límite

### Configuración del proveedor personalizado

Seleccione **Su propio proveedor** para exponer:

- **Proveedor** — Anthropic, OpenAI, Ollama o Personalizado (compatible con OpenAI)
- **Modelo** — el identificador exacto del modelo (p. ej. `claude-sonnet-4-20250514`, `gpt-4o`, `llama3`)
- **URL del endpoint** — solo para los proveedores Ollama y Personalizado. Para Ollama ejecutándose en el host mientras KANAP se ejecuta en Docker, use `http://host.docker.internal:<port>/v1`.
- **Clave API** — requerida cuando el proveedor la necesita. Las claves existentes se enmascaran; deje el campo en blanco para conservar el valor almacenado durante un guardado o prueba.

Una vez establecido todo, haga clic en **Probar conexión** para ejecutar un ping sin coste contra el proveedor. El resultado se muestra en una banda con el proveedor, el modelo y la latencia de ida y vuelta.

### Chips de estado

El encabezado de la tarjeta Proveedor muestra tres indicadores de un vistazo:

- **Chat habilitado / deshabilitado** — el conmutador maestro para el chat del usuario final
- **MCP habilitado / deshabilitado** — si los clientes MCP externos pueden conectarse
- **Proveedor listo / incompleto** — si la configuración del proveedor es válida

Los errores de validación (clave API faltante, forma de endpoint incorrecta, modelo desconocido) aparecen en una advertencia amarilla encima del formulario para que sepa exactamente qué corregir.

## Funcionalidades

La sección Funcionalidades alterna las superficies opcionales de Plaid:

- **Habilitar chat** — activa o desactiva el espacio de trabajo del chat dentro de la app para los usuarios finales
- **Habilitar MCP** — activa o desactiva la API MCP para clientes externos
- **Búsqueda web** — permite a Plaid buscar en la web (requiere que `BRAVE_SEARCH_API_KEY` esté configurada a nivel de instancia; el conmutador está deshabilitado y con tooltip de lo contrario). Activar el conmutador ejecuta automáticamente una prueba de conectividad.
- **Enriquecimiento web** — permite a Plaid hacer un seguimiento de una búsqueda recuperando páginas para un contexto más rico. Solo disponible cuando la búsqueda web está habilitada.

## Retención

La sección Retención limita cuánto tiempo Plaid conserva el contenido del usuario:

- **Retención de conversaciones (días)** — las conversaciones y sus mensajes con más antigüedad que este valor son elegibles para eliminación por el trabajo de limpieza. Deje vacío para conservarlas indefinidamente.

## Claves API de MCP

La sección MCP (Model Context Protocol) le permite emitir claves API de larga duración para que asistentes externos e IDEs puedan hablar con KANAP usando los mismos datos que Plaid ve.

La tarjeta muestra:

- Un botón **Crear clave**
- **Vida útil máxima de la clave (días)** — la vida útil máxima con la que puede emitirse cualquier clave nueva. Deje vacío para no tener límite de expiración.
- Una tabla de claves existentes con **Etiqueta**, **Prefijo**, **Creada**, **Expira**, **Último uso** y **Estado** (Activa o Revocada)

### Crear una clave

1. Haga clic en **Crear clave**.
2. Introduzca una **Etiqueta** descriptiva (por ejemplo, "Cliente MCP de escritorio").
3. Haga clic en **Crear**. KANAP genera un secreto de un solo uso.
4. Copie el secreto inmediatamente — se muestra una vez y no puede recuperarse más tarde.

### Revocar una clave

Haga clic en el icono de papelera de cualquier fila activa para revocar la clave. Las claves revocadas permanecen en la tabla con fines de auditoría pero ya no pueden autenticar.

## Visión general del uso

En la parte inferior de la página, la tarjeta **Visión general del uso** muestra métricas de chat de todo el espacio de trabajo:

- **Todas las conversaciones** — número total de conversaciones creadas alguna vez
- **Conversaciones activas (7d / 30d)** — conversaciones actualizadas en los últimos 7 o 30 días
- **Usuarios activos (30d)** — usuarios únicos que han chateado en los últimos 30 días

Una tabla de **Uso de tokens** desglosa las ventanas del **mes actual** y los **últimos 30 días** por tokens de entrada, tokens de salida, total de tokens y conteo de mensajes. Los totales de tokens se agregan a partir de mensajes de chat (el tráfico MCP no se incluye).

## Consejos

- **Pruebe antes de guardar**: el botón **Probar conexión** valida las credenciales sin escribir nada. Úselo antes de activar el chat para los usuarios finales.
- **Rote las claves MCP**: prefiera claves de corta duración para estaciones de trabajo compartidas. El campo **Vida útil máxima de la clave** limita cuánto tiempo puede emitirse cualquier clave nueva, independientemente de la solicitud.
- **Observe la barra de tokens**: un uso por encima de 1M tokens al mes en un solo espacio de trabajo normalmente significa que unas pocas conversaciones muy largas están consumiendo presupuesto — anime a los usuarios a iniciar nuevos hilos por tema.
- **Establezca la retención**: dejar las conversaciones para siempre es conveniente hasta que la base de datos crece o una revisión de conformidad pregunta cuánto tiempo se conserva el contenido del chat. Un punto de partida común es 90 o 180 días.

# Modelos IA

Esta página es la lista de modelos IA que su organización puede utilizar. Añade un modelo una sola vez —su proveedor, su dirección, su clave, sus precios— y a partir de ahí solo tiene que *asignarlo*: al [asistente de chat Plaid](ai-settings.md), a cualquier [agente IA](agents-workspace.md) concreto o como modelo predeterminado de toda la organización, al que recurre todo lo demás. También es de donde salen las cifras de coste de la página [Uso y costes](ai-usage.md): los precios que introduce aquí son los que KANAP usa para valorar el consumo real de tokens.

## Dónde encontrarlo

- Espacio de trabajo: **Administración**
- Ruta: **Administración → Inteligencia artificial → Modelos IA**
- Ruta URL: `/admin/ai-models`
- Permiso: `ai_settings:admin`

---

## Cómo se elige un modelo

Nada en KANAP está fijado a un único modelo. Cada consumidor —Plaid y cada agente— o bien apunta a un modelo concreto, o bien dice «usa el que use la organización». La regla es corta:

1. **El modelo asignado a ese consumidor**, si lo hay.
2. Si no, **el modelo predeterminado de la organización**: el que aparece marcado con una estrella en esta página.
3. Si no, **el modelo incluido de KANAP**.

Así que hay exactamente un modelo predeterminado por organización, y todo aquello que no toque lo sigue. Cambie el predeterminado y todos los consumidores sin asignación se mueven con él: para eso sirve tener uno.

El tercer paso solo existe en el servicio alojado de KANAP. En una instalación local no hay modelo incluido, de modo que si no hay nada asignado ni ningún predeterminado definido, la cadena simplemente se agota: la página de configuración de Plaid indica que no hay ningún modelo configurado y el chat no responde, mientras que los agentes siguen funcionando pero se saltan los pasos que necesitan un modelo —recurren a su comportamiento sin IA en lugar de fallar por completo—. Registrar un modelo lo soluciona: márquelo con la estrella como predeterminado para que todo lo adopte de una vez, o asígnelo consumidor por consumidor.

No puede romper esta cadena por ordenar la lista: un modelo al que algo siga apuntando no se puede archivar, y si alguna asignación acabara apuntando a un modelo archivado, el consumidor recurre al predeterminado en lugar de fallar.

---

## Trabajar con la lista

La tabla muestra todos los modelos que su organización ha registrado: primero los activos y debajo los archivados, por orden alfabético dentro de cada grupo.

**Columnas**:

- **Nombre** — el nombre que dio al modelo, más una ficha **Predeterminado** si es el predeterminado de la organización y **Archivado** si se ha retirado. Aquí aparece también la nota **Configuración incompleta** cuando falta algo obligatorio, casi siempre un modelo que necesita una clave API y no la tiene. Corríjalo: un modelo incompleto no recurre discretamente a otro, simplemente no funciona.
- **Modelo** — el proveedor en la primera línea y el identificador exacto del modelo debajo.
- **Capacidades** — **Imágenes ✓** si el modelo puede leer imágenes, **Solo texto** si no. Procede del conmutador **Comprende imágenes** del editor.
- **Precio entrada / M tokens** y **Precio salida / M tokens** — lo que paga por millón de tokens, en euros. Un guion (**—**) significa que no hay ningún precio registrado, lo que KANAP trata como gratuito.
- **Utilizado por** — todo lo que apunta actualmente a este modelo: **Plaid**, los nombres de los agentes que lo tienen asignado o **Sin asignar** si no lo usa nada. Esta es la columna que hay que leer antes de archivar nada.

**Acciones de fila** (solo en los modelos activos):

- **Usar como modelo predeterminado** / **Dejar de usar como modelo predeterminado** — la estrella. Un clic, sin diálogo. Solo puede haber un modelo predeterminado, así que marcar uno nuevo desmarca el anterior.
- **Editar** — abre el diálogo del editor.
- **Archivar** — retira el modelo. El botón está deshabilitado mientras algo siga usándolo, y el tooltip lo dice: *Este modelo sigue asignado y no se puede archivar*.

Las filas archivadas se muestran atenuadas con una única acción **Restaurar**. Archivar no es borrar, y es deliberado: el uso pasado sigue atribuido al modelo en la página [Uso y costes](ai-usage.md), y un modelo restaurado vuelve con su proveedor, su clave, sus precios y sus capacidades intactos, pero ya no es el predeterminado ni está asignado a nada, de modo que usted lo reasigna de forma deliberada. Un modelo archivado no se puede editar, ni convertir en predeterminado, ni asignar hasta que lo restaure.

### El modelo incluido de KANAP

En el servicio alojado, la primera fila de la tabla es siempre **Modelo incluido de KANAP** — *Operado por KANAP, incluido en su suscripción*. Se comporta de forma distinta a los modelos que usted añade, y es a propósito:

- Cuesta `0,00 €` en las dos columnas de precio. Forma parte de su suscripción; no es algo que se le facture por token.
- Es **multimodal** —lee las capturas de pantalla de los tickets— y eso no se puede cambiar.
- En lugar de una lista «Utilizado por», muestra sus **mensajes incluidos este mes** con una barra de progreso, para que vea cuánto queda del volumen mensual. Un mensaje es una pregunta hecha a Plaid, una solicitud de un asistente externo conectado por MCP o un ticket revisado por un agente: los tres consumen el mismo volumen.
- Lleva la ficha **Predeterminado** siempre que no haya ningún modelo propio activo marcado con la estrella: es la alternativa de «nada configurado» hecha visible.
- No tiene acciones: no se puede editar, ni archivar, ni marcar con la estrella. Simplemente está siempre ahí.

En una instalación local esta fila no aparece en absoluto.

---

## Añadir o editar un modelo

**Nuevo modelo** abre el editor; el lápiz de cualquier fila activa lo reabre para una entrada existente. Los campos:

- **Nombre** — cómo aparece el modelo allí donde lo asigna: en el selector de Plaid y en la lista **Modelo IA** de cada agente. Use algo que reconozca en un desplegable dentro de seis meses (*Claude producción*, *Mistral local*), no el identificador bruto del modelo. Tenga en cuenta que la tabla **Coste por modelo** de [Uso y costes](ai-usage.md) *no* usa este nombre: enumera el identificador al que se llamó realmente, como `anthropic:claude-sonnet-5`.
- **Proveedor** — quién sirve el modelo. La elección cambia cuáles de los campos siguientes se aplican.
- **Modelo** — el identificador exacto del modelo, tal como lo escribe el proveedor (por ejemplo, `claude-sonnet-5`). No es un nombre para mostrar; una errata aquí se manifiesta como una llamada fallida, no como un error de validación.
- **Dirección del servidor** — solo para los proveedores que usted aloja o que apuntan a un sitio concreto. Cuando KANAP se ejecuta en Docker y el modelo se ejecuta en la misma máquina anfitriona, dirija la petición al host en lugar de a `localhost`.
- **Clave API** — la credencial de su proveedor. Se almacena cifrada y no se vuelve a mostrar: cuando reabre un modelo existente, el campo está vacío con la indicación *Déjelo vacío para conservar la clave actual*, así que solo escribe en él para sustituir la clave. Si la instancia no tiene configurado ningún secreto de cifrado, una advertencia en la parte superior de la página explica que las claves no se pueden almacenar en absoluto.

**Capacidades**:

- **Comprende imágenes** — desactívelo para un modelo de solo texto. Como dice la indicación, las capturas de pantalla adjuntas a los tickets se *omiten* en lugar de enviarse, que es justo lo que le interesa: un modelo de solo texto que recibe una imagen hace fallar la llamada en vez de trabajo útil. Déjelo activado para un modelo con capacidad de visión y sus agentes de triaje usarán las capturas de los tickets como evidencia.

**Coste** — *Precio por millón de tokens, tal como figura en la página de precios de su proveedor*:

- **Entrada (€ / M tokens)** y **Salida (€ / M tokens)** — copie los dos números directamente de la página de precios de su proveedor. Suelen ser distintos, y KANAP los valora por separado.
- **Déjelos vacíos o póngalos a 0 para un modelo local o autoalojado.** Un modelo sin precios no cuesta nada, que es la verdad para un modelo que se ejecuta en su propio hardware. Elegir un proveedor Ollama rellena ambos precios con 0 exactamente por ese motivo.
- El coste de los agentes se calcula a medida que se hace el trabajo y luego se conserva, así que editar un precio cambia lo que cuestan los agentes **a partir de ahora** y deja intactas las cifras pasadas. El coste de Plaid se calcula de otra manera —consulte [Uso y costes](ai-usage.md)— y ahí un cambio de precio sí mueve las cifras históricas.

**Configuración avanzada**:

- **Tiempo máximo de respuesta (segundos)** — cuánto esperar a este modelo antes de desistir. Déjelo vacío para usar el límite estándar. Los modelos locales suelen necesitar más tiempo, y por eso el ajuste vive en cada modelo y no en la instalación.
- **Usar como modelo predeterminado** — la misma estrella de la tabla, disponible mientras crea el modelo.

**Probar conexión** aparece una vez guardado el modelo. Hace una llamada mínima con la configuración tal como está almacenada e informa de *Conexión correcta* con el tiempo de ida y vuelta, o bien del mensaje de error del propio proveedor. Demuestra que el proveedor, el identificador del modelo, la dirección y la clave funcionan juntos; no comprueba sus precios, ni el conmutador de imágenes, ni el ajuste de tiempo de respuesta. Ejecútelo después de añadir un modelo y después de rotar una clave: de lo contrario, una clave incorrecta es invisible hasta que falla trabajo real, y falla en silencio (una respuesta de chat que da error, o un agente que se salta un paso y sigue adelante).

**Crear** / **Guardar** permanecen deshabilitados hasta que el nombre y el identificador del modelo estén rellenos y los precios y el tiempo de respuesta sean números válidos. Los nombres deben ser únicos dentro de su organización.

---

## Consejos

- **Defina un predeterminado antes de asignar nada.** Con un modelo marcado con la estrella, cada nuevo agente y el propio Plaid funcionan de inmediato, y usted tiene un único sitio donde cambiar de modelo más adelante.
- **Nombre los modelos por su función, no por su versión.** *Modelo de triaje* sobrevive a una actualización de una versión del modelo a la siguiente; *Claude Sonnet 4.5* se convierte en una mentira el día que lo edite.
- **Registre el mismo proveedor dos veces cuando los trabajos difieran.** Un modelo barato de solo texto para el triaje de gran volumen y un modelo con visión para los tickets con muchas capturas es una configuración normal: por eso la asignación es por agente.
- **Ponga bien los precios, o déjelos vacíos.** No son decorativos: alimentan las cifras de coste de [Uso y costes](ai-usage.md) y los topes de **Coste por ejecución** de cada agente. Un modelo con precio 0 nunca alcanza un tope de coste, así que en un modelo gratuito los topes de tokens son su única protección.
- **Consulte Utilizado por antes de archivar.** El botón le avisa cuando un modelo sigue en uso, pero es más rápido leer la columna y mover antes a los consumidores.
- **Pruebe después de cada rotación de clave.** La prueba de conexión es gratis e instantánea; descubrir una clave caducada a través de una ejecución fallida de un agente no lo es.

# Sincronización con Netbox

[Netbox](https://netboxlabs.com/docs/netbox/) describe su infraestructura física y virtual: equipos, máquinas virtuales, racks, sitios, direcciones. KANAP lee ese inventario y mantiene sus propios activos alineados con él.

El reparto de responsabilidades es deliberado. Netbox sigue siendo la referencia para los equipos que describe, así que el nombre, el número de serie, la posición en el rack o la dirección principal vienen siempre de ahí. KANAP conserva la capa de negocio alrededor de cada activo: entorno, aplicaciones, contratos y costes, soporte, fechas, relaciones, notas. Deja de reescribir el inventario y conserva todo lo que Netbox no conoce.

## Dónde encontrarlo

- Espacio de trabajo: **Panorama IT**
- Ruta: **Panorama IT > Netbox**
- Ruta: `/it/netbox`
- Configuración de la conexión: **Administración > Integraciones**
- Permiso: `infrastructure:admin`, tanto para la tarjeta de conexión como para la página de sincronización
- Disponible en la nube y en la edición on-premise. No hay ningún indicador de funcionalidad que activar.

---

## Antes de empezar

**Una instancia de Netbox accesible para KANAP.** KANAP llama a Netbox desde el servidor, no desde su navegador. La dirección que introduzca tiene que resolverse y responder desde donde se ejecuta KANAP. En la edición en la nube, esa dirección debe ser pública: una dirección privada o interna se rechaza al guardar la conexión, y de nuevo antes de cada llamada. En la edición on-premise, una dirección de su propia red es exactamente lo que se espera.

**Un token de API con acceso de lectura.** En Netbox, abra el menú de usuario arriba a la derecha, luego **API tokens**, y cree uno. Basta con un token de solo lectura: KANAP nunca escribe nada en Netbox. Póngale una descripción para reconocerlo más tarde, y rótelo como haría con cualquier otra credencial de servicio.

**Una decisión sobre el certificado.** Si su Netbox usa un certificado en el que KANAP no confía, normalmente un certificado autofirmado o interno, puede activar **Ignorar los errores de certificado**. La conexión sigue cifrada, pero el certificado deja de comprobarse, así que úselo solo con un certificado que conozca y en el que confíe, en una red que controle. En un Netbox público, instale un certificado de confianza en su lugar.

---

## Conectar KANAP con Netbox

Vaya a **Administración > Integraciones** y abra la tarjeta **Inventario de Netbox**.

| Campo | Qué introducir |
|-------|----------------|
| **Activar la sincronización con Netbox** | El conmutador maestro. Cuando está desactivado, KANAP no llama nunca a Netbox, ni a mano ni de forma programada. |
| **Dirección de Netbox** | La dirección que usa para abrir Netbox en el navegador, por ejemplo `https://netbox.example.com`. |
| **Token de API** | El token que creó en Netbox. Se guarda cifrado y no se vuelve a mostrar. Deje el campo vacío al guardar para conservar el token ya almacenado. |
| **Tiempo de espera (segundos)** | Cuánto esperar a Netbox antes de abandonar, entre 5 y 120. Déjelo vacío para usar 30. |
| **Ignorar los errores de certificado** | Desactivado de forma predeterminada. Véase más arriba. |
| **Sincronización automática** | Se ejecuta cada hora y aplica los cambios por su cuenta. Déjela desactivada hasta que la primera ejecución le parezca correcta. |
| **Entorno de los nuevos activos** | Se aplica a los activos que crea esta integración. Después no se cambia nunca. |

**Probar conexión** hace una llamada de solo lectura e indica la versión de Netbox encontrada, o el motivo del fallo. Ejecútela después de cada cambio de dirección o de token. Una vez guardada la configuración, la tarjeta ofrece un enlace **Configurar la sincronización**, que lleva a **Panorama IT > Netbox**.

---

## Elegir qué se importa

Abra la pestaña **Correspondencias** en la página de Netbox. Dos tablas deciden todo el alcance de la importación.

- **Rol de Netbox > Tipo de activo KANAP**. Cada rol de equipo que Netbox conoce recibe un tipo de activo, o **No importar**.
- **Sitio de Netbox > Ubicación KANAP**. Cada sitio de Netbox recibe una de sus ubicaciones, o **No importar**.

Todo lo que quede en **No importar** se omite: sus objetos no se crean nunca, no se actualizan nunca y no se señalan nunca como ausentes. Así deja fuera de KANAP las regletas, los paneles de parcheo o un sitio de laboratorio, mientras importa los servidores que están al lado.

Una fila adicional acompaña a los roles: **Máquinas virtuales**. Todas las máquinas virtuales que contiene Netbox pasan por esa única fila, sea cual sea el rol que Netbox les dé, así que una sola decisión cubre el conjunto. Una máquina virtual toma el sitio de su clúster cuando no lleva uno propio.

Cada fila muestra cuántos equipos y máquinas virtuales cubre, de modo que puede ver qué va a traer una elección. Cuando un nombre de Netbox coincide claramente con uno suyo, la fila viene rellenada y marcada como **Sugerido**. Una sugerencia es solo una propuesta: nada se usa hasta que pulse **Guardar correspondencias**.

---

## La primera sincronización

Pulse **Sincronizar ahora**. KANAP lee Netbox y muestra **Revisar antes de aplicar** antes de escribir nada.

La vista previa está agrupada:

- **Nuevos activos**: objetos sin equivalente en KANAP. Se van a crear.
- **Activos actualizados**: objetos asociados a un activo existente que difiere. Cada uno enumera los campos que cambian, campo por campo, como `antes → después`.
- **Por decidir**: objetos sobre los que KANAP no decide por su cuenta. No les pasa nada hasta que los resuelva en la página.
- **Omitidos**: objetos fuera de alcance, contados por motivo (rol sin correspondencia, sitio sin correspondencia, sin nombre en Netbox, ignorado por usted).
- **Ausentes de Netbox**: activos que una ejecución anterior vinculó y cuyo objeto de Netbox ha desaparecido.
- **Avisos**: valores que Netbox devuelve y que KANAP no ha podido retomar, por ejemplo un sistema operativo que no está en su catálogo. Un objeto que no tiene nada que cambiar pero sí algo que señalar aparece también aquí.

Léala y pulse **Aplicar**. Los objetos que ya son idénticos se cuentan como sin cambios y no se tocan en absoluto. En inventarios grandes, la vista previa enumera solo los 500 primeros objetos; la ejecución aplica todo.

La aplicación se ejecuta en segundo plano. La página la sigue y se actualiza sola cuando termina.

---

## Cómo se asocian los objetos a los activos existentes

Una primera importación en un KANAP ya poblado tiene que encontrar los activos que usted ya tiene en lugar de duplicarlos. KANAP prueba cuatro cosas, en orden, y se detiene en la primera que encuentra algo:

1. **Un vínculo existente**. El objeto ya se asoció a un activo en una ejecución anterior.
2. **El número de serie**. Sobrevive a un cambio de nombre en cualquiera de los dos lados.
3. **El nombre de host**. Un nombre corto y un nombre completo se tratan como la misma máquina, así que `par-esx-01` en KANAP corresponde a `par-esx-01.example.com` en Netbox.
4. **El nombre del activo**, ignorando mayúsculas y el sufijo de dominio.

Si un paso encuentra exactamente un activo, esa es la asociación. Si encuentra varios, KANAP se detiene ahí y clasifica el objeto en **Por decidir** con los candidatos enumerados. Nunca fusiona por conjetura.

Otras dos reglas mantienen el resultado limpio:

- **Un activo pertenece a un solo objeto de Netbox**, y al revés. La base de datos lo impone. Un activo que ya pertenece a otro objeto queda fuera del alcance de todo lo demás, y vincular un activo ya ocupado se rechaza con un mensaje que nombra el objeto que lo retiene. Si dos objetos de Netbox llegan al mismo activo libre, ambos se le envían para que decida.
- **Un equipo eliminado y recreado en Netbox se recupera.** Vuelve con un identificador de Netbox nuevo, así que el registro antiguo pasa a ausente, libera su activo, y el objeto nuevo lo retoma por nombre de host en la misma ejecución. Si otro objeto se ha quedado con ese activo mientras tanto, el equipo que vuelve se trata como un objeto nuevo.

---

## Qué campos gestiona Netbox

| Gestionado por Netbox | Sigue siendo suyo en KANAP |
|-----------------------|----------------------------|
| Nombre | Entorno |
| Nombre de host y dominio | Notas y descripción |
| Número de serie | Fechas, soporte y garantía |
| Fabricante y modelo | Contratos y costes |
| Ubicación en el rack y unidad de rack | Aplicaciones alojadas en el activo |
| Dirección IP principal | Conexiones y otras relaciones |
| Sistema operativo | Adjuntos, tareas, incidentes |
| Ciclo de vida | Todo lo demás del activo |
| Ubicación | |

En un activo vinculado a Netbox, los campos gestionados aparecen como **Gestionado por Netbox** y no se pueden editar en KANAP. Cámbielos en Netbox y la siguiente ejecución los trae. Todo lo demás del activo sigue siendo editable como siempre.

La página del activo lleva además una línea **Origen**: cuándo se hizo la última sincronización, un enlace **Abrir en Netbox**, y un aviso cuando el objeto ya no está.

### Reglas que conviene conocer

**Un valor vacío en Netbox nunca borra un valor de KANAP.** Si Netbox no tiene número de serie y KANAP sí, se conserva el número de serie. Solo se escribe un valor que Netbox tenga de verdad.

**Las ediciones manuales se corrigen.** Cada ejecución compara con los valores reales del activo, así que un campo gestionado que se haya cambiado en KANAP por otra vía se vuelve a alinear en la siguiente ejecución.

**Los cambios de nombre se entienden.** Una diferencia de mayúsculas, o un sufijo de dominio, no es un cambio de nombre. `PAR-ESX-01` y `par-esx-01.example.com` son la misma máquina que `par-esx-01`.

**El ciclo de vida sigue una tabla fija.**

| Estado en Netbox | Ciclo de vida en KANAP |
|------------------|------------------------|
| Planned, Staged, Inventory | Propuesto |
| Active, Offline, Failed, Paused | Activo |
| Decommissioning | Obsoleto |
| Cualquier otro | Se deja sin cambios, con un aviso |

Una sincronización nunca pone un activo en **Retirado**. Retirar un equipo es una decisión que toma usted, desde la lista **Ausentes de Netbox**.

**El entorno se establece una sola vez.** Los activos nuevos reciben el entorno elegido en la tarjeta de la integración. Las ejecuciones posteriores no lo tocan nunca, así que puede corregirlo en KANAP y se queda corregido.

**Los valores que KANAP no conoce se omiten, nunca se inventan.** Un sistema operativo, un sufijo de dominio o un ciclo de vida que no esté en su catálogo (**Panorama IT > Configuración**) se deja sin cambios y se señala como aviso. Añada la entrada ahí y vuelva a ejecutar. Una dirección principal IPv6 se deja fuera igual, con el aviso «La dirección principal es una dirección IPv6, que todavía no se importa.».

**Un activo nuevo toma el proveedor de su ubicación** cuando ese proveedor existe en su configuración IT, y «Otro» en caso contrario. Netbox no tiene noción de proveedor de alojamiento.

**Una ejecución que falla sin parar se detiene.** Después de 10 objetos seguidos que no se han podido guardar, la ejecución se detiene y se declara fallida, en vez de llenar la lista de filas en error y luego anunciar que todo ha ido bien.

**Una lectura parcial no marca nada como ausente.** Si Netbox contiene más páginas de las que KANAP lee en una ejecución, no se señala nada como ausente y un aviso acompaña al resultado.

**Un reinicio del servidor no bloquea la página.** **Sincronizar ahora** vuelve a funcionar de inmediato; una ejecución interrumpida por el reinicio se declara detenida sin haber terminado.

---

## Sincronización automática

Active **Sincronización automática** en la tarjeta de la integración y KANAP ejecuta el mismo trabajo cada hora, aplicando los cambios sin vista previa. El conmutador es por espacio de trabajo, y solo se visitan los espacios de trabajo que lo han activado.

Los objetos que necesitan una decisión no se resuelven nunca de forma automática. Se acumulan en **Por decidir** y le esperan.

Una ejecución manual y una ejecución programada no pueden solaparse: si ya hay una en marcha, la otra no hace nada para ese espacio de trabajo y vuelve a intentarlo más tarde. En la edición en la nube, un espacio de trabajo con la suscripción congelada o con la prueba caducada se omite hasta que se resuelva la suscripción. Las instalaciones on-premise no se ven afectadas.

---

## La página de gestión

**Panorama IT > Netbox** es donde se trabaja una vez configurada la conexión. La banda superior muestra la última ejecución: cuándo fue, si se inició a mano o de forma automática, cuánto duró, su resultado, y cuántos objetos están vinculados o necesitan atención.

Debajo, la pestaña **Objetos** enumera todos los objetos de Netbox dentro del alcance, filtrados por estado.

| Estado | Qué significa | Qué puede hacer |
|--------|---------------|-----------------|
| **Por decidir** | Varios activos podrían ser este objeto, o dos objetos han llegado al mismo activo. | **Vincular a...** uno de los candidatos, **Crear un activo**, o **Ignorar**. |
| **Ausentes de Netbox** | El objeto ha desaparecido de Netbox. El activo queda intacto. | **Marcar el activo como retirado**, **Ignorar**, o dejarlo. |
| **Errores** | El objeto no se ha podido escribir, con el motivo en la columna Mensaje. | Corrija la causa y vuelva a ejecutar, o **Ignorar** el objeto. |
| **Ignorados** | Le ha dicho a KANAP que deje este objeto en paz. Se omite en cada ejecución. | **Dejar de ignorar** lo devuelve a la lista. Cuando el registro no contiene nada que decidir, lo retira en su lugar y el objeto se vuelve a evaluar en la siguiente sincronización. |
| **Vinculados** | El objeto y el activo están asociados y al día. | Abra cualquiera de los dos lados desde la fila. |

Cada fila enlaza con el objeto en Netbox y con el activo en KANAP, con su referencia `AST-`.

Vincular o crear desde esta página aplica los valores de Netbox de inmediato. Lee ese único objeto en Netbox, así que sigue siendo rápido en un inventario grande. Los mensajes y los avisos se muestran en su propio idioma.

### Ausentes de Netbox

**KANAP nunca elimina un activo.** Cuando un objeto desaparece de Netbox, el activo, sus vínculos y su historial se quedan exactamente como están, y el objeto se enumera como ausente para que usted decida. **Marcar el activo como retirado** pone el ciclo de vida en Retirado y conserva todo lo demás.

Se aplican dos salvaguardas. No se señala nada como ausente cuando la llamada a Netbox ha fallado, ni cuando Netbox ha devuelto un inventario vacío: una interrupción no es un desmantelamiento. Y un activo cuyo objeto de Netbox ha desaparecido vuelve a estar libre, así que la misma máquina recreada en Netbox se vincula de nuevo a él en lugar de crear un duplicado.

---

## El widget del panel de control

Hay un widget **Sincronización con Netbox** disponible en su panel de control personal. Está desactivado de forma predeterminada. Actívelo desde la configuración del panel, el icono de engranaje en **Panel de control**, y marque **Sincronización con Netbox**. El widget necesita `infrastructure:admin`, como el resto de la integración.

El widget no molesta cuando no hay nada que hacer: una línea que dice que la sincronización está al día, con la hora de la última ejecución. Cuando algo necesita atención, enumera solo lo que la necesita: objetos por decidir, activos ausentes de Netbox, errores, o una ejecución fallida. Cada línea abre la lista filtrada correspondiente.

---

## Resolución de problemas

| Lo que ve | Lo que suele significar |
|-----------|-------------------------|
| Netbox ha rechazado el token de API | El token se truncó al pegarlo, ha caducado, o está restringido a otra dirección. Cree uno nuevo en Netbox y vuelva a guardarlo. |
| No se permiten hosts privados ni internos | La edición en la nube solo llega a direcciones públicas. Publique Netbox en una dirección que KANAP pueda alcanzar, o ejecute KANAP on-premise junto a él. |
| No se ha podido verificar el certificado | Netbox presenta un certificado en el que KANAP no confía. Instale un certificado de confianza, o active **Ignorar los errores de certificado** si el certificado es suyo. |
| El servidor de Netbox no ha respondido a tiempo | Netbox está lento, inaccesible, o detrás de un cortafuegos que descarta la llamada. Compruébelo desde el servidor de KANAP y luego suba el tiempo de espera si la instancia es simplemente grande. |
| Los objetos aparecen como omitidos, con el motivo «Rol sin correspondencia» o «Sitio sin correspondencia» | Es lo esperado para todo lo que dejó en **No importar**. Si no debía omitirse, asigne el rol o el sitio y vuelva a ejecutar. |
| Un aviso dice que un sistema operativo no está en su catálogo | La plataforma de Netbox no tiene entrada correspondiente en **Panorama IT > Configuración**. Añádala ahí y vuelva a ejecutar; el campo se deja sin cambios hasta entonces. |
| La ejecución ha fallado después de unos pocos objetos | Diez objetos seguidos no se han podido guardar, así que la ejecución se ha detenido. La causa suele ser la misma para todos, y los detalles están en el registro del servidor. |
| «Netbox ha devuelto más páginas de las previstas. Algunos objetos no se han revisado.» | El inventario es más grande de lo que una ejecución lee. Lo leído se aplica, y no se marca nada como ausente. Reduzca el alcance en **Correspondencias** para que la ejecución cubra lo que le importa. |

---

## Consejos

- **Primero las correspondencias, después la sincronización.** Las correspondencias son el alcance. Empiece por los roles y los sitios de los que esté seguro, ejecute una vez, y amplíe después.
- **Lea la vista previa en la primera ejecución.** Es la única ejecución en la que todas las asociaciones son nuevas, así que es la que merece leerse línea por línea.
- **Rellene los números de serie.** Es la asociación más sólida que existe. Los activos que llevan número de serie sobreviven a los cambios de nombre en ambos lados sin caer nunca en **Por decidir**.
- **Espere antes de activar la ejecución horaria.** Dos ejecuciones manuales limpias seguidas, la segunda sin nada que cambiar, significan que las correspondencias y las asociaciones son correctas.

# Mapa de conexiones

El Mapa de conexiones proporciona una visualización interactiva de la topología de red de su infraestructura. Los activos aparecen como nodos y las conexiones como aristas, mostrando cómo fluyen los datos a nivel de infraestructura. Utilícelo para explorar dependencias, rastrear rutas de conexión y exportar diagramas para documentación de arquitectura.

## Dónde encontrarlo

Navegue a **Panorama IT > Mapa de conexiones** para abrir la visualización.

**Permisos**: Necesita al menos `applications:reader` para ver el mapa.

---

## Comprender la visualización

El mapa utiliza un diseño de grafo dirigido por fuerzas donde:
- Los **nodos** representan servidores, clústeres o entidades lógicas
- Las **aristas** representan conexiones entre componentes de infraestructura
- Los **colores** indican el tipo de alojamiento (local, nube) o tipo de nodo
- La **ubicación basada en roles** (habilitada por defecto) guía los nodos en bandas de arriba a abajo según niveles de roles

### Tipos de nodos

| Tipo | Forma | Color del borde | Descripción |
|------|-------|-----------------|-------------|
| **Servidores** | Rectángulo redondeado | Verde (local) o azul (nube) | Instancias de infraestructura individuales (VMs, contenedores, etc.) |
| **Clústeres** | Rectángulo redondeado, borde discontinuo | Cian | Grupos de servidores que actúan como una unidad lógica única |
| **Entidades** | Forma de pastilla / estadio | Naranja | Puntos de conexión lógicos (sistemas externos, servicios SaaS) |

Los miembros del clúster aparecen como nodos separados con líneas discontinuas conectándolos a su nodo padre de clúster.

---

## Filtros

### Ciclo de vida

Filtro de selección múltiple para el estado del ciclo de vida de la conexión. Elija qué estados incluir en la visualización (p. ej., Activo, Planificado, Obsoleto). Por defecto solo **Activo**.

### Aplicaciones

Encontrar servidores por las aplicaciones que ejecutan:
1. Seleccione una o más aplicaciones del desplegable **Aplicaciones**
2. Seleccione entornos en el desplegable **Entorno App** (muestra solo entornos donde las aplicaciones seleccionadas tienen servidores asignados)
3. Los servidores coincidentes se añaden automáticamente al filtro de **Servidores**

Esto es útil cuando desea ver las conexiones de infraestructura de una aplicación específica sin saber qué servidores la ejecutan.

### Servidores

Seleccione directamente servidores, clústeres o entidades para enfocarse:
1. Haga clic en el desplegable **Servidores**
2. Seleccione elementos (agrupados por tipo: Entidades, Clústeres, Servidores)
3. Use el filtro de **Profundidad** para controlar cuántos saltos mostrar

Cuando selecciona elementos aquí, aparece un chip "+N más" si hay muchos seleccionados. Haga clic para ver y gestionar la lista completa.

### Profundidad

Limitar cuántos "saltos" desde los servidores seleccionados se muestran:
- **Todos**: Mostrar todas las conexiones (sin filtro de profundidad)
- **0**: Mostrar solo servidores seleccionados, sus clústeres padre y las entidades directamente adyacentes
- **1--5**: Mostrar servidores dentro de N saltos de los servidores seleccionados

La profundidad se establece automáticamente en **0** cuando selecciona servidores a través de los filtros de Aplicaciones o Servidores.

---

## Opciones de visualización

### Mostrar conexiones multi-servidor

Alternar la visibilidad de las conexiones multi-servidor (conexiones que involucran más de dos servidores en una topología de malla). Habilitado por defecto.

### Mostrar capas de conexión

Cuando está habilitado (por defecto), muestra las rutas individuales de la conexión como aristas separadas. Esto muestra cómo una conexión multi-ruta se dirige a través de puntos intermedios. Cuando está deshabilitado, las conexiones se muestran como aristas simples de origen a destino.

### Ubicación basada en roles

Cuando está habilitado (por defecto), el mapa mantiene su diseño de fuerzas pero añade orientación vertical por niveles:

- Bandas **Superior / Medio-superior / Central / Medio-inferior / Inferior**
- Los **servidores** utilizan las asignaciones de roles configuradas en la configuración del Panorama IT
- Las **entidades** utilizan su nivel de grafo configurado (predeterminado: Superior)
- Los **servidores sin asignar** caen al nivel Central
- Los **clústeres** heredan el nivel de mayor prioridad de sus miembros

Utilice este conmutador cuando desee una vista de topología que se lea como niveles de arquitectura (componentes de borde en la parte superior, almacenes de datos en la inferior).

Este conmutador es solo de sesión y se restablece al recargar la página.

---

## Controles del grafo

El panel de control en el lado izquierdo del mapa proporciona estas herramientas:

| Control | Acción | Descripción |
|---------|--------|-------------|
| Pausa / Reproducir | **Congelar / Descongelar** | Pausar la simulación de fuerzas para posicionar nodos manualmente |
| Diana | **Auto-centrar** | Alternar el centrado automático al seleccionar nodos (azul = habilitado) |
| Zoom + | **Acercar** | Aumentar el nivel de zoom |
| Zoom - | **Alejar** | Disminuir el nivel de zoom |
| Cuadrícula | **Ajustar a cuadrícula** | Alinear todos los nodos a una cuadrícula para diseños más limpios |
| SVG | **Exportar SVG** | Descargar la vista actual como imagen vectorial |
| PNG | **Exportar PNG** | Descargar la vista actual como imagen rasterizada |

También puede hacer zoom con la rueda del ratón y desplazarse haciendo clic y arrastrando el fondo.

---

## Interactuar con el mapa

### Seleccionar nodos

Haga clic en un nodo de servidor o clúster para:
- Resaltar sus conexiones
- Abrir un panel de detalle con:
  - **Tipo de servidor**: Tipo de servidor (Web, Base de datos, Aplicación, etc.)
  - **Ubicación del servidor**: Código de ubicación física o en la nube
  - **Sistema operativo**: Detalles del SO
  - **Segmento de red**: Zona de red
  - **Dirección IP**: Dirección de red
  - **Aplicaciones asignadas**: Aplicaciones ejecutándose en este servidor, agrupadas por entorno (clicables)
- Botón **Editar servidor** o **Ver clúster** para abrir el espacio de trabajo

Haga clic en un nodo de entidad para ver su tipo y entorno.

### Seleccionar aristas

Haga clic en una arista de conexión para:
- Ver los detalles de la conexión:
  - **Propósito**: Para qué se usa la conexión
  - **Protocolos**: Protocolos de red utilizados
  - **Puertos típicos**: Números de puertos esperados
  - **Criticidad**: Importancia para el negocio
  - **Topología**: Servidor a servidor o Multi-servidor
- Botón **Editar conexión** para abrir el espacio de trabajo de la conexión
- Sección **Interfaces vinculadas** que muestra qué interfaces de aplicación usan esta conexión
  - Haga clic en **Abrir interfaz** para ver la interfaz
  - Haga clic en **Ver en Mapa de interfaces** para ver la interfaz en contexto

### Arrastrar nodos

Arrastre cualquier nodo para reposicionarlo. Mientras la simulación está en ejecución, el diseño se ajustará alrededor del nodo movido. Cuando la simulación está congelada, el arrastre mueve el nodo libremente sin afectar a los demás.

---

## Enlace directo

El mapa admite parámetros de URL para compartir vistas específicas:

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `lifecycles` | Preseleccionar filtros de ciclo de vida (separados por comas) | `active,planned` |
| `focusConnectionId` | Resaltar una conexión específica | UUID |
| `rootIds` | Preseleccionar servidores a enfocar (separados por comas) | UUIDs |
| `depth` | Establecer el límite de profundidad | `0`, `1`, `all` |

**Ejemplo**: `/it/connection-map?lifecycles=active&rootIds=abc123&depth=1`

---

## Visualización de clústeres

Los clústeres se muestran como nodos distintos con un borde cian discontinuo:
- Los miembros del clúster aparecen como nodos separados, conectados a su nodo padre de clúster por líneas indicadoras discontinuas
- Al filtrar por profundidad=0, se muestran tanto los servidores miembros seleccionados como sus clústeres padre
- Los servidores miembros heredan las conexiones del clúster manteniendo sus conexiones individuales servidor a servidor

---

## Configurar niveles del grafo

Puede controlar dónde tienden a aparecer verticalmente los nodos editando niveles en **Panorama IT > Configuración**:

- Lista de **Roles de servidor**: establezca el nivel del grafo para cada rol (p. ej., Web = Superior, BD = Inferior)
- Lista de **Entidades**: establezca el nivel del grafo para cada tipo de entidad (las entidades por defecto son Superior)

Los cambios de nivel surten efecto la próxima vez que se carguen los datos del mapa.

---

## Consejos

- **Empiece por las aplicaciones**: Utilice el filtro de Aplicaciones para encontrar servidores de una aplicación específica, luego explore sus conexiones con profundidad=1.
- **Use profundidad=0 para vistas enfocadas**: Cuando solo quiera ver conexiones entre servidores específicos, selecciónelos y establezca la profundidad en 0.
- **Exporte para documentación de arquitectura**: Utilice la exportación SVG para crear diagramas de red para documentación o revisiones de seguridad. La exportación PNG produce una imagen rasterizada de alta resolución.
- **Active capas para depuración**: Active "Mostrar capas de conexión" para ver exactamente cómo las conexiones multi-ruta se dirigen a través de su infraestructura.
- **Use niveles de roles para vistas de arquitectura**: Mantenga la "Ubicación basada en roles" activada al presentar diagramas de arquitectura por capas.
- **Referencia cruzada con el Mapa de interfaces**: Utilice el botón "Ver en Mapa de interfaces" en el panel de conexión para ver qué interfaces de negocio dependen de cada conexión de infraestructura.
- **Ajuste para claridad**: Después de posicionar nodos, use Ajustar a cuadrícula para diseños más limpios y alineados.
- **Congele antes de exportar**: Congele el diseño y posicione los nodos manualmente antes de exportar para obtener el resultado más limpio.

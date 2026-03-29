# Mapa de interfaces

El Mapa de interfaces proporciona una visualización interactiva de su panorama de integración de aplicaciones. Las aplicaciones aparecen como nodos y las interfaces como aristas conectoras, ofreciéndole una vista panorámica de cómo fluyen los datos entre sus sistemas.

## Dónde encontrarlo

Navegue a **Panorama IT > Mapa de interfaces** para abrir la visualización.

**Permisos**: Necesita al menos `applications:reader` para ver el mapa.

---

## Comprender la visualización

El mapa utiliza un diseño de grafo dirigido por fuerzas donde:

- Los **nodos** representan aplicaciones
- Las **aristas** representan interfaces entre aplicaciones
- El **tamaño del nodo** refleja el número de interfaces conectadas
- Las **etiquetas de las aristas** muestran el identificador de la interfaz a lo largo de cada conexión

### Vista de negocio vs Vista técnica

**Vista de negocio** (predeterminada):

- Oculta las aplicaciones middleware
- Muestra relaciones directas origen-destino
- Ideal para comprender los flujos de datos de negocio

**Vista técnica**:

- Muestra las plataformas middleware como nodos intermedios (mostrados con forma de diamante)
- Muestra la ruta real de datos (Origen → Middleware → Destino)
- Ideal para comprender la arquitectura técnica

Alterne entre vistas usando el conmutador **Mostrar middleware** en la barra de herramientas.

---

## Filtros

Todos los filtros se encuentran en la barra de herramientas encima del mapa.

### Entorno

Filtre interfaces por entorno de despliegue:

- Producción, Pre-producción, QA, Test, Desarrollo, Sandbox

El valor predeterminado es **Producción**.

### Ciclo de vida

Filtro de selección múltiple para el estado del ciclo de vida de la interfaz. Elija qué estados incluir en la visualización (p. ej., Activo, Planificado, Obsoleto). La selección predeterminada es **Activo**.

### Aplicaciones

Enfoque el mapa en aplicaciones o servicios específicos:

1. Haga clic en el desplegable **Aplicaciones**
2. Seleccione una o más aplicaciones (agrupadas por tipo: Aplicaciones vs Servicios de infraestructura)
3. El mapa se filtra para mostrar solo interfaces conectadas a su selección

Cuando selecciona aplicaciones aquí, el filtro de **Profundidad** cambia automáticamente de "Todos" a "1" para que vea solo el vecindario inmediato.

### Profundidad

Limitar cuántos saltos desde las aplicaciones seleccionadas se muestran:

- **Todos**: Mostrar todos los nodos conectados (sin límite)
- **1--5**: Mostrar solo nodos dentro de N saltos de las aplicaciones seleccionadas

Los nodos middleware no cuentan como un salto -- el contador de profundidad solo se incrementa al atravesar un nodo de aplicación principal.

Este filtro se habilita automáticamente cuando selecciona aplicaciones en el filtro de Aplicaciones.

---

## Controles del grafo

El panel de control en el lado izquierdo del mapa proporciona estas herramientas:

| Icono | Acción | Descripción |
|-------|--------|-------------|
| Pausa / Reproducir | **Congelar / Descongelar** | Pausar la simulación de fuerzas para posicionar nodos manualmente |
| Centro | **Auto-centrar** | Alternar el centrado automático al seleccionar nodos (resaltado cuando está habilitado) |
| Zoom + | **Acercar** | Aumentar el nivel de zoom |
| Zoom - | **Alejar** | Disminuir el nivel de zoom |
| Cuadrícula | **Ajustar a cuadrícula** | Alinear todos los nodos a una cuadrícula para diseños más limpios |
| SVG | **Exportar SVG** | Descargar la vista actual como imagen vectorial |
| PNG | **Exportar PNG** | Descargar la vista actual como imagen rasterizada |

Los botones de congelación y auto-centrar cambian de color cuando están activos, para que pueda saber de un vistazo si están activados o desactivados.

---

## Interactuar con el mapa

### Seleccionar nodos

Haga clic en un nodo de aplicación para resaltar sus conexiones y abrir un panel de detalle a la derecha.

### Seleccionar aristas

Haga clic en una arista de interfaz para ver los detalles de la interfaz en el panel lateral. Las aristas tienen un área de clic invisible más ancha, por lo que no necesita hacer clic precisamente en la línea.

### Arrastrar nodos

Arrastre cualquier nodo para reposicionarlo manualmente. Mientras la simulación está en ejecución, el diseño continúa ajustándose alrededor del nodo movido. Cuando la simulación está congelada, el nodo permanece exactamente donde lo coloque.

### Borrar la selección

Haga clic en el área de fondo vacía del mapa para cerrar el panel de detalle y borrar cualquier selección.

### Enlace directo

El mapa admite parámetros de URL para compartir vistas específicas:

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `environment` | Preseleccionar un entorno | `prod`, `dev` |
| `lifecycles` | Preseleccionar filtros de ciclo de vida (separados por comas) | `active,planned` |
| `focusInterfaceId` | Resaltar una interfaz específica | UUID |
| `rootIds` | Preseleccionar aplicaciones a enfocar (separadas por comas) | UUIDs |
| `depth` | Establecer el límite de profundidad | `1`, `2`, `all` |

**Ejemplo**: `/it/interface-map?environment=prod&rootIds=abc123&depth=2`

---

## El panel de detalle

Cuando selecciona un nodo o arista, se abre un panel lateral a la derecha con detalles.

### Panel de aplicación

- **Descripción**: Qué hace la aplicación
- **Editor**: Editor del software
- **Criticidad**: Importancia para el negocio (Crítica para el negocio, Alta, Media, Baja)
- **Servidores**: Servidores que alojan esta app, agrupados por entorno. Haga clic en el nombre de un servidor para abrir su espacio de trabajo.
- **Responsables de negocio**: Contactos de negocio responsables
- **Responsables IT**: Contactos técnicos responsables
- **Información de soporte**: Contactos de soporte con sus roles. Haga clic en un nombre de contacto para navegar a la pestaña Técnico de la aplicación.
- **Editar aplicación**: Abre el espacio de trabajo de la aplicación

### Panel de interfaz

- **Criticidad**: Nivel de importancia para el negocio
- **Ruta**: Tipo de ruta de integración
- **Enlaces**: Número de enlaces de entorno
- **Vía middleware**: Si la interfaz se enruta a través de middleware
- **Endpoints**: Para el entorno seleccionado, muestra aplicaciones de origen y destino, nombres de trabajo y URLs de endpoints
- **Conexiones de infraestructura**: Conexiones de infraestructura vinculadas a esta interfaz para el entorno actual. Cada tarjeta de conexión muestra origen, destino y protocolos. Desde aquí puede:
  - Hacer clic en **Editar** para abrir el espacio de trabajo de la conexión
  - Hacer clic en **Ver en Mapa de conexiones** para ver la topología de infraestructura
- **Editar interfaz**: Abre el espacio de trabajo de la interfaz

---

## Consejos

- **Empiece con Producción**: Seleccione el entorno Prod para ver primero sus integraciones más críticas.
- **Enfóquese en apps específicas**: Utilice el filtro de Aplicaciones con profundidad 2 para ver solo el vecindario de una aplicación sin todo el panorama.
- **Exporte para documentación**: Utilice la exportación SVG para crear diagramas de arquitectura para documentación o presentaciones. Utilice PNG cuando necesite una imagen rasterizada.
- **Ajuste para claridad**: Después de arrastrar nodos a posición, utilice Ajustar a cuadrícula para crear diseños más limpios y alineados.
- **Enlace directo para compartir**: Copie la URL después de configurar filtros para compartir vistas específicas con colegas.
- **Cambie a Vista técnica**: Al depurar, active la visibilidad de middleware para ver la ruta real de datos a través de las plataformas de integración.

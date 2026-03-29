# Activos

Los Activos documentan su inventario de infraestructura -- servidores físicos, máquinas virtuales, contenedores, instancias en la nube y dispositivos de red. Vincule activos a aplicaciones, ubicaciones, conexiones y registros financieros para construir una imagen completa de su infraestructura IT.

## Primeros pasos

Navegue a **Panorama IT > Activos** para ver su inventario de activos. Haga clic en **Añadir activo** para crear su primera entrada.

**Campos obligatorios**:
- **Nombre**: Un nombre de activo o hostname único
- **Tipo de activo**: Servidor web, base de datos, servidor de aplicaciones, dispositivo de red, etc.
- **Ubicación**: Dónde está alojado el activo (determina el proveedor, tipo de alojamiento y país)

**Muy recomendados**:
- **Ciclo de vida**: Estado actual (Activo, Obsoleto, Retirado, etc.)
- **Entorno**: A qué entorno pertenece este activo (Prod, Pre-prod, QA, etc.)

**Consejo**: Utilice convenciones de nomenclatura consistentes que incluyan información de entorno y rol (p. ej., `prod-web-01`, `dev-db-master`). Al crear un nuevo activo, el hostname se deriva automáticamente del nombre que escribe.

---

## Trabajar con la lista

La lista de activos proporciona una visión filtrable y ordenable de cada activo en su inventario.

**Columnas predeterminadas**:

| Columna | Qué muestra |
|---------|-------------|
| **Nombre** | Nombre del activo (haga clic para abrir el espacio de trabajo) |
| **Tipo de activo** | El rol del activo (p. ej., Máquina virtual, Servidor físico) |
| **Clúster** | Pertenencia al clúster, o una insignia "Clúster" si este activo es un clúster |
| **Entorno** | Prod, Pre-prod, QA, Test, Dev, Sandbox |
| **Ubicación** | Dónde está alojado el activo |
| **Alojamiento** | Tipo de alojamiento (derivado de la ubicación) |
| **SO** | Sistema operativo |
| **Zona de red** | Segmento de red (derivado de la subred) |
| **Ciclo de vida** | Estado actual del ciclo de vida |
| **Asignaciones** | Número de asignaciones de aplicación |
| **Creado** | Cuándo se creó el registro |

**Columnas adicionales** (ocultas por defecto, disponibles mediante el selector de columnas):
- **Sub-ubicación**: Área específica dentro de la ubicación (edificio, sala, rack)
- **Puesta en marcha**: Fecha en que el activo entró en producción
- **Fin de vida**: Fecha de retiro planificada o real

**Filtrado**:

La mayoría de columnas admiten filtros de conjunto de casillas para un filtrado rápido multi-selección. Las opciones de filtro se actualizan dinámicamente basándose en otros filtros activos y la consulta de búsqueda, para que solo vea valores que existen en el conjunto de resultados actual.

| Columna | Notas |
|---------|-------|
| Tipo de activo | Filtrar por uno o más tipos de activo |
| Clúster | Incluye "(Sin clúster)" para activos independientes |
| Entorno | Prod, Pre-prod, QA, Test, Dev, Sandbox |
| Ubicación | Incluye "(Sin ubicación)" para activos sin asignar |
| Sub-ubicación | Incluye "(Sin sub-ubicación)" para activos sin una |
| Alojamiento | Filtrar por tipo de alojamiento |
| SO | Filtrar por sistema operativo |
| Zona de red | Filtrar por segmento de red |
| Ciclo de vida | Filtrar por estado de ciclo de vida |

**Consejo**: Combine filtros entre columnas para reducir resultados. Por ejemplo, filtre por Entorno = "Prod" y Ciclo de vida = "Activo" para ver solo activos de producción activos.

**Acciones**:
- **Añadir activo**: Crear un nuevo activo (requiere `infrastructure:member`)
- **Importar CSV** / **Exportar CSV**: Operaciones masivas (requiere `infrastructure:admin`)
- **Eliminar seleccionados**: Eliminar activos seleccionados (requiere `infrastructure:admin`)

---

## Clústeres

Los activos pueden organizarse en clústeres:

- **Activo regular**: Una instancia de infraestructura individual
- **Clúster**: Un grupo de activos que actúan como una unidad lógica única

Al crear o editar un activo, active **Este servidor representa un clúster** para marcarlo como clúster. Los activos de tipo clúster pueden ser endpoints en conexiones, pero las instancias de aplicación deben asignarse a los hosts miembros, no al clúster en sí.

Los miembros del clúster se gestionan desde la pestaña **Técnico** del espacio de trabajo del clúster.

---

## El espacio de trabajo de Activos

Haga clic en cualquier fila para abrir el espacio de trabajo. El encabezado muestra el nombre del activo, una insignia "Clúster" (cuando aplica) y su posición en la lista (p. ej., "3 de 47"). Utilice los botones de flecha para navegar al activo anterior o siguiente sin volver a la lista.

### Visión general

La pestaña Visión general captura la identidad y ubicación del activo.

**Qué puede editar**:
- **Nombre**: Hostname o identificador del activo
- **Tipo de activo**: Rol (Servidor web, Base de datos, Servidor de aplicaciones, etc.)
- **Es clúster**: Conmutador para marcar este activo como clúster
- **Ubicación**: Vínculo a un registro de Ubicación (obligatorio). Seleccionar una ubicación rellena automáticamente los campos de solo lectura a continuación.
- **Sub-ubicación**: Cuando la ubicación seleccionada tiene sub-ubicaciones definidas (edificios, salas, racks), este desplegable aparece para que pueda especificar exactamente dónde se encuentra el activo dentro de la ubicación.
- **Ciclo de vida**: Estado actual (Activo, Obsoleto, Retirado, etc.)
- **Fecha de puesta en marcha**: Cuándo el activo entró en producción
- **Fecha de fin de vida**: Fecha de retiro planificada o real
- **Notas**: Notas de texto libre sobre el activo

**Campos de solo lectura** (derivados de la ubicación seleccionada):
- **Tipo de alojamiento**: Local, coubicación, nube, etc.
- **Proveedor cloud / Empresa operadora**: Para ubicaciones en la nube, muestra el proveedor cloud; para locales, muestra la empresa operadora
- **País**: País de la ubicación
- **Ciudad**: Ciudad de la ubicación

---

### Técnico

La pestaña Técnico organiza la identidad de red y la configuración en secciones lógicas.

**Entorno**:
- **Entorno**: Prod, Pre-prod, QA, Test, Dev o Sandbox

**Secciones de clúster**:
- Si este activo **es un clúster**: Muestra la tabla de **Miembros** listando todos los activos miembros (Nombre, Entorno, Estado, Sistema operativo). Haga clic en **Editar miembros** para añadir o eliminar miembros a través de un diálogo de búsqueda.
- Si este activo **no es un clúster**: Muestra **Pertenencia a clúster** -- a qué clústeres pertenece este activo, si alguno.

**Identidad**:
- **Hostname**: El hostname de red del activo. Se prerellena automáticamente desde el nombre del activo al crearlo; puede sobrescribirlo en cualquier momento. Obligatorio cuando se selecciona un dominio.
- **Dominio**: El dominio Active Directory o DNS al que pertenece el activo. Elija entre dominios configurados en **Configuración > Panorama IT**. Las opciones del sistema incluyen "Workgroup" (independiente) y "N/A" (no aplica).
- **FQDN**: Nombre de dominio completamente cualificado, calculado automáticamente desde el hostname y el sufijo DNS del dominio. Solo lectura.
- **Alias**: Nombres DNS adicionales o alias para este activo. Escriba y presione Enter para añadir.
- **Sistema operativo**: Tipo y versión del SO (p. ej., Windows Server 2022, Ubuntu 24.04 LTS). Deshabilitado para clústeres -- el SO se define por miembro. Cuando se selecciona, muestra las fechas de fin de soporte estándar y extendido.

**Direcciones IP**:

Los activos admiten múltiples direcciones IP, cada una con su propia configuración de red:

- Haga clic en **Añadir dirección IP** para añadir una nueva entrada
- **Tipo**: El propósito de la dirección IP (Host, IPMI, Gestión, iSCSI o tipos personalizados de Configuración)
- **Dirección IP**: La dirección en sí
- **Subred**: Subred de red de la lista configurada (filtrada a la ubicación del activo)
- **Zona de red**: Derivada automáticamente de la subred seleccionada (solo lectura)
- **VLAN**: Derivada automáticamente de la subred seleccionada (solo lectura)

Esto le permite documentar múltiples interfaces de red por activo -- por ejemplo, un servidor físico con una IP de host y una dirección de gestión IPMI en diferentes subredes.

---

### Hardware

*Solo visible para tipos de activos físicos.*

Hace seguimiento de detalles de hardware físico:
- **Número de serie**
- **Fabricante**
- **Modelo**
- **Fecha de compra**
- **Ubicación en rack** (p. ej., Fila A, Rack 12)
- **Unidad de rack** (p. ej., U1-U4)
- **Notas**

---

### Soporte

*Solo visible para tipos de activos físicos.*

Hace seguimiento del soporte del proveedor e información de contacto:
- **Proveedor**: Seleccione del directorio de proveedores
- **Contrato de soporte**: Vínculo a un registro de contrato
- **Nivel de soporte**: Texto libre (p. ej., Gold, Silver, 24x7)
- **Expiración del soporte**: Fecha de expiración
- **Notas**

**Contactos de soporte**: Una tabla donde puede añadir contactos del directorio de contactos, cada uno con una etiqueta de rol. La tabla muestra automáticamente el correo, teléfono y móvil de cada contacto.

---

### Relaciones

La pestaña Relaciones le permite definir cómo se conecta este activo con otros registros en KANAP.

**Relaciones de activos**:
- **Depende de**: Otros activos de los que depende este (p. ej., un servidor de base de datos)
- **Contiene**: Activos contenidos dentro de este (p. ej., servidores en un rack)
- **Contenido por** / **Dependiente de por**: Vistas de solo lectura inversas que muestran qué otros activos referencian a este

**Financieros**:
- **Partidas OPEX**: Vínculo a partidas de gasto operativo
- **Partidas CAPEX**: Vínculo a partidas de gasto de capital
- **Contratos**: Vínculo a registros de contratos

**Proyectos**: Vínculo a proyectos del portafolio relacionados con este activo.

**Sitios web relevantes**: Añada URLs con descripciones opcionales -- útil para portales de proveedores, paneles de monitorización o enlaces de documentación.

**Adjuntos**: Arrastre y suelte archivos o haga clic en **Seleccionar archivos** para subir. Haga clic en un chip de adjunto para descargarlo.

---

### Base de conocimiento

Adjunte artículos de conocimiento a este activo. Si tiene el permiso `knowledge:member`, puede crear nuevos artículos directamente desde esta pestaña.

---

### Asignaciones

Vea y gestione qué aplicaciones se ejecutan en este activo. Cada asignación vincula el activo a una instancia de aplicación (un entorno específico de una aplicación).

**Para añadir una asignación**:
1. Haga clic en **Añadir asignación**
2. Seleccione una **Aplicación**
3. Elija un **Entorno** (instancia)
4. Seleccione un **Rol** (de la lista de roles de servidor en Configuración)
5. Opcionalmente establezca una **Fecha desde** y **Notas**

Los activos de tipo clúster no pueden alojar asignaciones de aplicación -- asigne los hosts miembros en su lugar.

Cada fila de asignación muestra el nombre de la aplicación (clicable para navegar a ella), entorno, rol, fecha desde y notas. Puede editar o eliminar asignaciones desde la columna de acciones.

---

### Conexiones

Una vista de solo lectura de todas las conexiones que involucran a este activo. Cada fila muestra:

| Columna | Qué muestra |
|---------|-------------|
| **ID de conexión** | Enlace clicable al espacio de trabajo de la conexión |
| **Nombre** | Nombre de la conexión |
| **Topología** | Servidor a servidor o Multi-servidor |
| **Protocolos** | Chips de protocolo |
| **Origen** | Etiqueta del punto de conexión de origen |
| **Destino** | Etiqueta del punto de conexión de destino |
| **Ciclo de vida** | Estado del ciclo de vida de la conexión |

Para gestionar conexiones, navegue a **Panorama IT > Conexiones**.

---

## Importación/exportación CSV

Mantenga su inventario de activos a escala usando la importación y exportación CSV. Esta funcionalidad soporta operaciones masivas para carga inicial de datos, actualizaciones periódicas desde sistemas externos y extracción de datos para informes.

### Acceder a las funciones CSV

Desde la lista de Activos:
- **Exportar CSV**: Descargar activos a un archivo CSV
- **Importar CSV**: Subir un archivo CSV para crear o actualizar activos

**Permisos requeridos**: `infrastructure:admin` para operaciones de importación/exportación.

### Opciones de exportación

| Opción | Descripción |
|--------|-------------|
| **Exportación completa** | Todos los campos exportables -- úselo para informes y extracción completa de datos |
| **Enriquecimiento de datos** | Todos los campos importables -- coincide con el formato de la plantilla de importación, ideal para edición de ida y vuelta (exportar, modificar, reimportar) |
| **Selección personalizada** | Elija campos específicos para incluir en su exportación |

**Descarga de plantilla** (desde el diálogo de Importación): Descarga un CSV en blanco con todos los encabezados de campos importables -- úselo para preparar archivos de importación con la estructura correcta.

### Flujo de trabajo de importación

1. **Prepare su archivo**: Use codificación UTF-8 con separadores de punto y coma (`;`). Descargue una plantilla para asegurar encabezados correctos.

2. **Elija la configuración de importación**:
   - **Modo**:
     - `Enriquecer` (predeterminado): Las celdas vacías preservan los valores existentes -- solo actualiza lo que especifique
     - `Reemplazar`: Las celdas vacías borran los valores existentes -- reemplazo completo de todos los campos
   - **Operación**:
     - `Upsert` (predeterminado): Crear nuevos activos o actualizar los existentes
     - `Solo actualizar`: Solo modificar activos existentes, omitir nuevos
     - `Solo insertar`: Solo crear nuevos activos, omitir existentes

3. **Validar primero**: Haga clic en **Verificación previa** para validar su archivo sin hacer cambios. Revise errores y advertencias.

4. **Aplicar cambios**: Si la validación es correcta, haga clic en **Importar** para confirmar los cambios.

### Referencia de campos

**Campos principales**:

| Columna CSV | Descripción | Obligatorio | Notas |
|-------------|-------------|-------------|-------|
| `id` | UUID del activo | No | Para actualizaciones; deje en blanco para nuevos activos |
| `name` | Nombre del activo | Sí | Se usa como identificador único para coincidencias |
| `location_code` | Código de ubicación | Sí | Debe coincidir con un código de ubicación existente |
| `kind` | Tipo de activo | Sí | Acepta código o etiqueta (p. ej., `vm` o `Virtual Machine`) |
| `environment` | Entorno | Sí | `prod`, `pre_prod`, `qa`, `test`, `dev`, `sandbox` |
| `status` | Estado del ciclo de vida | No | Acepta código o etiqueta (p. ej., `active` o `Active`) |
| `is_cluster` | Es este un clúster | No | `true` o `false` |
| `hostname` | Hostname de red | No | |
| `domain` | Dominio DNS | No | Acepta código o etiqueta de Configuración |
| `aliases` | Alias DNS | No | Lista separada por comas |
| `operating_system` | Tipo de SO | No | Acepta código o etiqueta de Configuración |
| `cluster` | Pertenencia a clúster | No | Nombre del clúster padre |
| `notes` | Notas de texto libre | No | |

**Campos de dirección IP** (hasta 4 direcciones por activo):

| Columna CSV | Descripción | Notas |
|-------------|-------------|-------|
| `ip_1_type` | Tipo de dirección IP | Acepta código o etiqueta (p. ej., `host` o `Host IP`) |
| `ip_1_address` | Dirección IP | |
| `ip_1_subnet_cidr` | Subred en notación CIDR | |
| `ip_2_type` hasta `ip_4_type` | Tipos de IP adicionales | Mismo patrón para slots 2-4 |
| `ip_2_address` hasta `ip_4_address` | Direcciones adicionales | |
| `ip_2_subnet_cidr` hasta `ip_4_subnet_cidr` | Subredes adicionales | |

### Aceptación de etiquetas y códigos

Para campos configurados en **Configuración > Panorama IT**, puede usar tanto el código interno como la etiqueta visible:

| Campo | Ejemplos de códigos | Ejemplos de etiquetas |
|-------|---------------------|----------------------|
| Tipo de activo (`kind`) | `vm`, `physical`, `container` | `Virtual Machine`, `Physical Server`, `Container` |
| Ciclo de vida (`status`) | `active`, `inactive`, `decommissioned` | `Active`, `Inactive`, `Decommissioned` |
| Sistema operativo | `windows_2022`, `ubuntu_24` | `Windows Server 2022`, `Ubuntu 24.04 LTS` |
| Dominio | `corp`, `dmz` | `Corporate Domain`, `DMZ` |
| Tipo de dirección IP | `host`, `ipmi`, `mgmt` | `Host IP`, `IPMI`, `Management` |

El sistema normaliza automáticamente los valores durante la importación, por lo que `Virtual Machine`, `virtual machine` y `vm` se resuelven al mismo tipo de activo.

### Coincidencia y actualizaciones

Los activos se emparejan por **nombre** (sin distinguir mayúsculas). Cuando se encuentra una coincidencia:
- Con modo `Enriquecer`: Solo los valores CSV no vacíos actualizan el activo
- Con modo `Reemplazar`: Todos los campos se actualizan, los valores vacíos borran datos existentes

Si incluye la columna `id` con un UUID válido, la coincidencia usa primero el ID, luego el nombre como respaldo.

### Campos derivados

Algunos campos se calculan y no pueden importarse:
- **Proveedor**: Derivado automáticamente de la ubicación del activo
- **FQDN**: Calculado desde hostname + dominio

### Limitaciones

- **Máximo 4 direcciones IP**: Los activos admiten hasta 4 entradas de dirección IP vía CSV
- **Asignación de clúster por nombre**: Use el nombre del clúster, no el ID, en la columna `cluster`
- **Ubicación obligatoria**: Cada activo debe tener un código de ubicación válido
- **Relaciones no incluidas**: Asignaciones de aplicación, conexiones, vínculos financieros y adjuntos deben gestionarse en el espacio de trabajo

### Solución de problemas

**Error "El archivo no tiene el formato correcto"**: Esto generalmente indica un problema de codificación. Asegúrese de que su CSV esté guardado como **UTF-8**:

- **En LibreOffice**: Al abrir un CSV, seleccione `UTF-8` en el desplegable de Juego de caracteres (no "Japanese (Macintosh)" u otras codificaciones). Al guardar, marque "Editar configuración de filtro" y elija UTF-8.
- **En Excel**: Guardar como > CSV UTF-8 (delimitado por comas), luego abra en un editor de texto para cambiar comas por puntos y coma.
- **Consejo general**: Si ve caracteres ilegibles al inicio de su archivo, la codificación es incorrecta.

### Ejemplo CSV

```csv
name;location_code;kind;environment;status;hostname;domain;ip_1_type;ip_1_address
PROD-WEB-01;NYC-DC1;Virtual Machine;prod;Active;prodweb01;corp;Host IP;10.0.1.10
PROD-DB-01;NYC-DC1;vm;prod;active;proddb01;corp;host;10.0.1.20
```

---

## Consejos

- **Nombre consistentemente**: Incluya entorno, rol y secuencia en los nombres de activos para fácil identificación.
- **Use clústeres**: Agrupe activos relacionados (p. ej., clúster web, clúster de base de datos) para simplificar la gestión.
- **Haga seguimiento del ciclo de vida**: Marque los activos obsoletos y retirados para mantener conteos de inventario precisos.
- **Vincule a ubicaciones**: Asigne activos a ubicaciones para informes geográficos y planificación de DR.
- **Asigne a aplicaciones**: Vincule activos a instancias de aplicación para entender qué se ejecuta dónde.
- **Use la pestaña Relaciones**: Conecte activos a partidas OPEX/CAPEX, contratos y proyectos para visibilidad financiera.
- **Adjunte documentación**: Suba archivos de configuración, diagramas de arquitectura o documentación del proveedor directamente al activo.

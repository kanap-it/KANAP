# Configuración del Panorama IT

La página de **Configuración del Panorama IT** le permite personalizar los valores de los desplegables utilizados en todo el Panorama IT. Estas listas controlan qué opciones aparecen cuando los usuarios crean o editan Aplicaciones, Interfaces, Activos, Conexiones y Ubicaciones. Los cambios aquí se aplican a todos los usuarios de su espacio de trabajo.

Para la legibilidad del mapa, las **Entidades** y **Roles de servidor** también incluyen un campo de **Nivel del grafo** utilizado por la ubicación basada en roles del Mapa de conexiones.

## Dónde encontrarla

- Espacio de trabajo: **Panorama IT**
- Ruta: **Panorama IT > Configuración**
- Permisos:
  - Necesita al menos `settings:reader` para ver la página.
  - Necesita `settings:admin` para cambiar valores.

Si no ve la entrada **Configuración** en el cajón del Panorama IT, solicite a su administrador que le otorgue los permisos apropiados.

## Cómo está organizada la página

La configuración se agrupa en tres secciones plegables:

1. **Ubicaciones** - Listas usadas al crear o editar Ubicaciones.
2. **Servidores y conexiones** - Listas para Servidores, Conexiones y datos de infraestructura relacionados.
3. **Apps, servicios e interfaces** - Listas usadas en Aplicaciones, Instancias de app, Interfaces y Enlaces.

Cada lista aparece como un panel expandible. Haga clic en el encabezado de un panel para expandirlo y ver los valores. Solo una sección carga su contenido cuando la expande por primera vez, lo que mantiene la página rápida incluso cuando tiene muchas listas.

### Controles del editor

Cada lista tiene sus propios controles en la parte superior:

- **Añadir elemento** - Inserta una nueva fila en la parte superior de la lista, enfocada y lista para escribir.
- **Guardar cambios** - Guarda sus ediciones en el servidor. Se habilita cuando tiene cambios sin guardar.
- **Restablecer** - Revierte la lista al último estado guardado (no a los valores de fábrica).

Para listas largas (más de 25 filas), la tabla virtualiza filas, mostrando unas 20 a la vez con desplazamiento suave y encabezados fijos.

---

## Ubicaciones

### Proveedores cloud

Proveedores cloud disponibles para Activos y Ubicaciones de tipo cloud (p. ej., AWS, Azure, GCP).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Activos → pestaña Visión general → campo **Proveedor**
- Espacio de trabajo de Ubicaciones → pestaña Visión general → **Proveedor cloud** (cuando el tipo de alojamiento es cloud)

### Tipos de alojamiento

Modelos de alojamiento de ubicaciones (p. ej., Local, Coubicación, Nube pública, Nube privada, SaaS).

**Columnas**: Etiqueta, Código, Categoría (Local/Coubicación o Nube/SaaS), Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Ubicaciones → pestaña Visión general → campo **Tipo de alojamiento**

La categoría determina qué campos aparecen al editar una Ubicación:
- **Local / Coubicación** muestra campos de Empresa operadora y Centro de datos
- **Nube / SaaS** muestra campos de Proveedor cloud, Región e Información adicional

---

## Servidores y conexiones

### Tipos de conexión

Un catálogo de dos niveles de protocolos de conexión organizados por categoría, con puertos típicos.

**Columnas**: Categoría (p. ej., Base de datos, Acceso remoto), Etiqueta, Código, Puertos típicos, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Conexiones → selector de **Tipo de conexión**

El campo **Puertos típicos** es texto libre - puede introducir puertos individuales (`443`), listas (`80, 443`), rangos (`9101-9103`) o marcadores de posición como `multiple` o `specify`.

Las categorías predeterminadas incluyen: Aplicación, Autenticación, Respaldo, Base de datos, Correo, Compartir archivos, Transferencia de archivos, Mensajería, Monitorización, Servicios de red, Acceso remoto, Replicación, Almacenamiento, VPN / Túnel, Genérico.

### Dominios

Dominios Active Directory o DNS a los que pueden pertenecer los activos. Se usan para calcular el nombre de dominio completamente cualificado (FQDN) de cada activo.

**Columnas**: Nombre, Código, Sufijo DNS, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Activos → pestaña Técnico → selector de **Dominio**
- Espacio de trabajo de Activos → pestaña Técnico → **FQDN** (calculado automáticamente desde hostname + sufijo DNS)

**Entradas del sistema** (no pueden modificarse ni eliminarse):
- **Workgroup** - Para activos independientes no unidos a un dominio
- **N/A** - Para tipos de activo donde la pertenencia a dominio no aplica (p. ej., dispositivos de red, racks)

**Comportamiento de auto-relleno**: Al añadir un nuevo dominio, los campos Código y Sufijo DNS se auto-rellenan basándose en el Nombre que introduzca. Puede sobrescribir estos valores si es necesario.

**Ejemplo**: Un dominio llamado "Corporate AD" con sufijo DNS `corp.example.com` produciría un FQDN de `hostname.corp.example.com` para un activo con hostname `web-server-01`.

### Entidades

Entidades de origen y destino para flujos de datos y patrones de acceso (p. ej., Usuarios internos, Internet, Redes de partners, Sistemas externos).

**Columnas**: Etiqueta, Código, Nivel del grafo, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Conexiones → campos de **Entidad de origen** y **Entidad de destino**
- Mapa de conexiones → las entidades aparecen como endpoints de flujo y usan el Nivel del grafo para la ubicación vertical (las entidades predeterminadas son Superior)

### Valores de Nivel del grafo

El Nivel del grafo controla la banda vertical preferida en el Mapa de conexiones cuando la **Ubicación basada en roles** está habilitada:

- **Superior**: Endpoints más orientados al usuario o externos
- **Medio-superior**: Capa de aplicación/servicio superior
- **Central**: Capa media neutral/predeterminada
- **Medio-inferior**: Infraestructura de soporte
- **Inferior**: Endpoints pesados en datos/almacenamiento

### Tipos de dirección IP

Tipos de direcciones IP que pueden asignarse a activos. Útil para distinguir entre diferentes interfaces de red como IPs de host, interfaces de gestión y redes de almacenamiento.

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Valores predeterminados**: Host, IPMI, Gestión, iSCSI

**Dónde se usa**:
- Espacio de trabajo de Activos → pestaña Técnico → sección **Direcciones IP** → desplegable de **Tipo**

Los activos pueden tener múltiples direcciones IP, cada una con su propio tipo. Por ejemplo, un servidor físico podría tener:
- Una IP de **Host** para tráfico de aplicaciones
- Una IP **IPMI** para gestión fuera de banda
- Una IP **iSCSI** para conectividad de red de almacenamiento

### Zonas de red

Zonas de red usadas para categorizar subredes y describir la conectividad de activos (p. ej., LAN, DMZ, LAN industrial, WiFi, Nube pública, Invitados, Gestión, Almacenamiento, VPN).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Lista de subredes → selector de **Zona de red**
- Espacio de trabajo de Activos → pestaña Técnico → **Zona de red** (auto-rellenada cuando se selecciona una subred)

### Subredes

Defina subredes de red con notación CIDR, asignaciones VLAN opcionales y clasificación por zona de red. Cada subred pertenece a una Ubicación específica.

**Columnas**: Ubicación, CIDR, VLAN (1-4094), Zona de red, Descripción, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Activos → pestaña Técnico → selector de **Subred**

**Reglas de validación**:
- CIDR debe ser notación IPv4 válida (p. ej., `192.168.1.0/24`)
- Los números de VLAN deben estar entre 1 y 4094
- CIDR y números de VLAN son únicos por ubicación (los mismos valores pueden existir en diferentes ubicaciones)

**Auto-rellenado**: Cuando selecciona una subred en un Activo, la Zona de red se rellena automáticamente desde la configuración de la subred.

### Sistemas operativos

Catálogo de sistemas operativos para Activos, incluyendo fechas del ciclo de vida de soporte.

**Columnas**: Nombre, Código, Fecha de fin de soporte estándar, Fecha de fin de soporte extendido, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Activos → pestaña Técnico → selector de **Sistema operativo** (el texto de ayuda muestra las fechas de soporte)

Las fechas se almacenan como `AAAA-MM-DD` pero se muestran y editan como `DD/MM/AAAA`.

Las entradas predeterminadas incluyen versiones de Windows Server, Ubuntu LTS, RHEL, Debian y SLES con fechas de soporte apropiadas.

### Roles de servidor

Roles asignados a activos al vincularlos a instancias de aplicación (p. ej., Servidor web, Servidor de base de datos, Worker).

**Columnas**: Etiqueta, Código, Nivel del grafo, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Aplicaciones → pestaña Servidores → desplegable de **Rol** al vincular un activo a una instancia
- Mapa de conexiones → banda de ubicación derivada del rol para servidores y clústeres

Ejemplos predeterminados integrados:
- `web`, `proxy` → **Superior**
- `app`, `cloud-service` → **Medio-superior**
- `db` → **Inferior**

### Tipos de activo

Tipos lógicos para activos de infraestructura (p. ej., Servidor físico, Máquina virtual, Contenedor, Serverless, Appliance).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Activos → pestaña Visión general → campo **Tipo**

---

## Apps, servicios e interfaces

### Métodos de acceso

Métodos por los cuales los usuarios acceden a las aplicaciones (p. ej., Navegador web, App móvil, Sesión VDI).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Valores predeterminados**: Web, Aplicación instalada localmente, Aplicación móvil, HMI propietario (interfaz industrial), Terminal / CLI, VDI / Escritorio remoto, Kiosk

**Dónde se usa**:
- Espacio de trabajo de Aplicaciones → pestaña Técnico y soporte → campo de selección múltiple **Métodos de acceso**

**Consejo**: Personalice los métodos de acceso para que coincidan con cómo su organización categoriza el acceso a aplicaciones. Por ejemplo, añada "Citrix" o "Cliente ligero" si son patrones de acceso comunes en su entorno.

### Categorías de aplicación

Categorías que describen el propósito principal de cada aplicación o servicio.

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Valores predeterminados**: Línea de negocio, Productividad, Seguridad, Analítica, Desarrollo, Integración, Infraestructura

**Dónde se usa**:
- Espacio de trabajo de Aplicaciones → pestaña Visión general → campo **Categoría**
- Lista de Aplicaciones → columna y filtro de **Categoría**

**Consejo**: Personalice las categorías para que coincidan con la terminología de su organización. Por ejemplo, renombre "Línea de negocio" a "Aplicaciones de negocio" si así las denomina su equipo.

### Clases de datos

Niveles de clasificación de datos para Aplicaciones e Interfaces.

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Códigos bloqueados**: Los niveles integrados (Público, Interno, Confidencial, Restringido) no pueden eliminarse ni marcarse como obsoletos.

**Dónde se usa**:
- Espacio de trabajo de Aplicaciones → pestaña Conformidad → campo **Clase de datos**
- Espacio de trabajo de Interfaces → pestaña Visión general → campo **Clase de datos**
- Lista de Aplicaciones → columna **Clase de datos**

### Patrones de integración

Patrones de integración para rutas de Interfaz (p. ej., REST API, Lote de archivos, Cola, Staging BD).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Rutas de interfaz → campo **Patrón**

### Modos de autenticación de interfaces

Modos de autenticación para enlaces de Interfaz (p. ej., Cuenta de servicio, OAuth2, Clave API, Certificado).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Enlaces de interfaz → campo **Modo de autenticación**

### Categorías de datos de interfaces

Categorías de datos de negocio para Interfaces (p. ej., Datos maestros, Transaccional, Informes, Control).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Espacio de trabajo de Interfaces → campo **Categoría de datos**

### Formatos de datos de interfaces

Formatos de carga para rutas de Interfaz (p. ej., CSV, JSON, XML, IDoc, Binario).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Rutas de interfaz → campo **Formato**

### Protocolos de interfaces

Protocolos técnicos para enlaces de Interfaz (p. ej., HTTP/REST, gRPC, SFTP, Kafka, Base de datos).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Enlaces de interfaz → campo **Protocolo** (enlaces legado)

### Tipos de disparador de interfaces

Mecanismos de disparo para rutas de Interfaz (p. ej., Basado en eventos, Programado, Tiempo real, Manual).

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Dónde se usa**:
- Rutas de interfaz → campo **Disparador**

### Estados del ciclo de vida

Estados de ciclo de vida compartidos para Aplicaciones, Instancias de app, Interfaces, Enlaces de interfaz y Activos.

**Columnas**: Etiqueta, Código, Indicador de obsoleto

**Códigos bloqueados**: Los estados integrados (Propuesto, Activo, Obsoleto, Retirado) no pueden eliminarse ni tener sus códigos modificados.

**Dónde se usa**:
- Aplicaciones, Instancias de app, Interfaces, Enlaces de interfaz, Activos → campos de **Estado**

---

## Cómo afectan los cambios a los datos existentes

- **Los registros existentes conservan sus códigos almacenados** - Cambiar una etiqueta solo cambia lo que ven los usuarios, no los datos subyacentes.
- **Valores obsoletos**:
  - Permanecen válidos para registros que ya los utilizan.
  - Se ocultan de los desplegables al crear nuevos registros.
  - Siguen apareciendo durante la edición si el registro ya usa ese valor.
- **Nuevos valores** están disponibles inmediatamente en los desplegables relevantes y se validan en el servidor.

Este enfoque le permite evolucionar su taxonomía con el tiempo sin romper los registros existentes.

---

## Referencia rápida: qué lista alimenta qué campo

| Lista | Dónde se usa |
|-------|--------------|
| **Métodos de acceso** | Aplicaciones (pestaña Técnico y soporte → Métodos de acceso) |
| **Categorías de aplicación** | Aplicaciones (Categoría) |
| **Proveedores cloud** | Activos (Proveedor), Ubicaciones (Proveedor cloud) |
| **Tipos de conexión** | Conexiones (Tipo de conexión) |
| **Clases de datos** | Aplicaciones (pestaña Conformidad), Interfaces (Visión general), Lista de aplicaciones |
| **Dominios** | Activos (pestaña Técnico → Dominio, FQDN) |
| **Entidades** | Conexiones (Entidad de origen/destino), Mapa de conexiones (ubicación por Nivel del grafo) |
| **Tipos de alojamiento** | Ubicaciones (Visión general) |
| **Patrones de integración** | Rutas de interfaz (Patrón) |
| **Modos de autenticación** | Enlaces de interfaz (Modo de autenticación) |
| **Categorías de datos de interfaces** | Interfaces (Categoría de datos) |
| **Formatos de datos de interfaces** | Rutas de interfaz (Formato) |
| **Protocolos de interfaces** | Enlaces de interfaz (Protocolo) |
| **Tipos de disparador de interfaces** | Rutas de interfaz (Disparador) |
| **Tipos de dirección IP** | Activos (pestaña Técnico → Direcciones IP → Tipo) |
| **Estados del ciclo de vida** | Aplicaciones, Instancias de app, Interfaces, Enlaces, Activos |
| **Zonas de red** | Subredes (Zona de red), Activos (auto-rellenado desde subred) |
| **Sistemas operativos** | Activos (pestaña Técnico) |
| **Subredes** | Activos (pestaña Técnico → Direcciones IP → Selector de subred) |
| **Roles de servidor** | Aplicaciones → pestaña Servidores (rol al vincular activo a app), Mapa de conexiones (ubicación por Nivel del grafo) |
| **Tipos de activo** | Activos (Visión general → Tipo) |

---

## Consejos

- **Alinee las etiquetas con su terminología** - Revise los valores predeterminados y renombre las etiquetas para que coincidan con cómo su organización habla de estos conceptos. Los códigos permanecen iguales; solo cambia el texto visible.
- **Marque como obsoleto gradualmente** - Al dejar de usar un valor, márquelo como obsoleto en lugar de eliminarlo. Esto mantiene los datos históricos intactos mientras dirige a los usuarios hacia nuevas opciones.
- **Coordine las Clases de datos con seguridad** - Los cambios en las Clases de datos deben alinearse con sus políticas de seguridad de la información. Consulte con conformidad antes de añadir o renombrar niveles de clasificación.
- **Use los puertos típicos como documentación** - El campo "Puertos típicos" de los Tipos de conexión es informativo. Complételo para ayudar a los usuarios a entender qué puertos usa comúnmente cada tipo de conexión.
- **Ajuste la legibilidad del mapa con niveles** - Mantenga los Niveles del grafo de Entidades y Roles de servidor alineados con sus capas de arquitectura (borde, aplicación, datos) para diseños más claros del Mapa de conexiones.

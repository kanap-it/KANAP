# Aplicaciones

Aplicaciones es su registro central para documentar el panorama de aplicaciones IT. Cubre aplicaciones de negocio, herramientas de productividad, servicios de infraestructura y todo lo intermedio. Utilícelo para hacer seguimiento de la propiedad, entornos, integraciones e información de conformidad en todo su portafolio.

## Categorías de aplicaciones

Cada aplicación o servicio pertenece a una **categoría** que describe su propósito principal. Esta clasificación ayuda a diferentes partes interesadas a filtrar y centrarse en lo que les importa.

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| **Línea de negocio** | Aplicaciones de negocio principales que soportan procesos de negocio específicos | SAP, Salesforce, Workday, ERP personalizado |
| **Productividad** | Herramientas para el usuario final en el trabajo diario, incluidas utilidades y colaboración | Office 365, Acrobat Reader, Teams, Slack, Chrome |
| **Seguridad** | Herramientas para proteger sistemas, datos y acceso | CrowdStrike, Okta, plataformas SIEM, firewalls |
| **Analítica** | Herramientas de informes, inteligencia de negocio y almacén de datos | Power BI, Tableau, Snowflake |
| **Desarrollo** | Herramientas utilizadas por equipos de desarrollo y DevOps | Python, Git, Jenkins, VS Code, Docker |
| **Integración** | Plataformas que conectan sistemas y mueven datos | MuleSoft, Kafka, pasarelas API, herramientas ETL |
| **Infraestructura** | Servicios fundamentales de los que dependen otros sistemas | PostgreSQL, Redis, Kubernetes, sistemas de almacenamiento |

**Consejos para la clasificación**:
- Elija según el **propósito principal** de la aplicación, no según quién la gestiona
- En caso de duda, pregunte: "¿Para qué se usa principalmente esta herramienta?"
- Las categorías pueden personalizarse en **Panorama IT > Configuración** para coincidir con la terminología de su organización

### Filtrado por parte interesada

Diferentes equipos pueden usar categorías para centrarse en su área de responsabilidad:

| Parte interesada | Filtro sugerido |
|-------------------|-----------------|
| Ciberseguridad | Categoría Seguridad, o alta criticidad en todas las categorías |
| Mesa de servicio | Productividad + Línea de negocio (aplicaciones orientadas al usuario) |
| Infraestructura | Infraestructura + Integración |
| Arquitectura empresarial | Todas las categorías |

---

## Primeros pasos

Navegue a **Panorama IT > Aplicaciones** para ver su lista. Haga clic en **Nueva App / Servicio** para crear su primera entrada.

**Campos obligatorios**:
  - **Nombre**: Un nombre reconocible para la aplicación o servicio
  - **Categoría**: El propósito principal de esta aplicación (ver categorías arriba)

**Muy recomendados**:
  - **Proveedor**: El proveedor que proporciona el software (vinculado a sus datos maestros de Proveedores)
  - **Criticidad**: Importancia para su negocio (Crítica para el negocio, Alta, Media, Baja)
  - **Ciclo de vida**: Estado actual (Activo, Propuesto, Obsoleto, Retirado)
  - **Categoría**: El propósito principal de la aplicación (Línea de negocio, Productividad, Seguridad, etc.)

**Opcionales pero útiles**:
  - **Editor**: El editor del software (p. ej., Microsoft, SAP, Oracle)
  - **Descripción**: Qué hace esta aplicación
  - **Versión**: Número de versión actual (p. ej., "4.2.1", "2023", "T1 2024")
  - **Fecha de puesta en marcha** / **Fin de soporte** / **Fecha de retiro**: Fechas del ciclo de vida de la versión
  - **Licencia**: Términos y notas de licencia
  - **Notas**: Notas internas de texto libre

Una vez que guarde, el espacio de trabajo desbloquea todas las pestañas para documentación detallada.

**Consejo**: Comience documentando sus aplicaciones más críticas. Utilice la pestaña **Instancias** para capturar qué entornos existen (Prod, QA, Dev), luego vincule activos e interfaces a medida que avance.

---

## Trabajar con la lista

La cuadrícula de Aplicaciones proporciona una vista completa de su portafolio de aplicaciones.

**Filtro de alcance superior**:
  - **Mis apps** (predeterminado): muestra apps donde usted está listado en **Propiedad y audiencia** como **Responsable de negocio** o **Responsable IT**. Se admiten entradas con múltiples responsables.
  - **Apps de mi equipo**: muestra apps donde cualquier miembro de su equipo de Portafolio está listado como Responsable de negocio o Responsable IT. Su propia propiedad también se incluye en este alcance.
  - **Todas las apps**: muestra la cuadrícula completa de Aplicaciones (con el comportamiento predeterminado de filtro de ciclo de vida).
  - Si no está asignado a un equipo de Portafolio, **Apps de mi equipo** está deshabilitado
  - Su selección se recuerda entre sesiones -- al volver a la página se restaura su última elección

**Columnas predeterminadas**:
  - **Nombre**: Nombre de la aplicación con insignia de categoría y pertenencia a suite
  - **Categoría**: Propósito principal de la aplicación (Línea de negocio, Productividad, etc.)
  - **Entornos**: Chips que muestran entornos activos (Prod, Pre-prod, QA, Test, Dev, Sandbox)
  - **Ciclo de vida**: Estado actual
  - **Criticidad**: Nivel de importancia para el negocio
  - **Editor**: Editor del software
  - **Usuarios derivados (Y)**: Conteo calculado de usuarios para el año actual
  - **Creado**: Cuándo se creó el registro

**Ordenación predeterminada**:
  - **Nombre** ascendente (A a Z)

**Columnas adicionales** (mediante el selector de columnas):
  - **Suites**: Suites padre a las que pertenece esta aplicación
  - **Proveedor**: Nombre del proveedor vinculado
  - **Responsables de negocio** / **Responsables IT**: Responsables asignados
  - **Alojamiento**: Derivado de las ubicaciones de servidores asignados a las instancias de la app
  - **Acceso externo**: Si la app es accesible desde internet
  - **SSO habilitado** / **MFA habilitado**: Características de autenticación
  - **Integración de datos / ETL**: Si la app participa en integraciones de datos
  - **Partidas OPEX** / **Partidas CAPEX** / **Contratos**: Gasto y contratos vinculados
  - **Componentes**: Aplicaciones hijas (si es una suite)
  - **Clase de datos** / **Contiene PII** / **Residencia de datos**: Información de conformidad

**Filtrado**:
  - Categoría, Entornos, Ciclo de vida, Criticidad, Alojamiento, Acceso externo, SSO habilitado, MFA habilitado, Clase de datos y Contiene PII usan filtros de conjunto de casillas
  - El filtro flotante muestra `Todos`, `Ninguno` o `N seleccionados` con una **x** para limpiar
  - Las aplicaciones retiradas están ocultas por defecto; use el filtro de Ciclo de vida para incluir Retiradas

**Acciones**:
  - **Nueva App / Servicio**: Crear una nueva entrada (requiere permiso de gestor)
  - **Importar CSV**: Importación masiva desde archivo CSV (requiere permiso de administrador)
  - **Exportar CSV**: Exportar la lista a CSV (requiere permiso de administrador)
  - **Copiar elemento**: Duplicar una aplicación seleccionada con todas sus relaciones (requiere permiso de gestor)
  - **Eliminar seleccionadas**: Eliminar aplicaciones seleccionadas (requiere permiso de administrador)

---

## El espacio de trabajo de Aplicaciones

Haga clic en cualquier fila de la lista para abrir el espacio de trabajo. Tiene nueve pestañas:

### Visión general

La pestaña Visión general captura la identidad principal de su aplicación.

**Qué puede editar**:
  - **Nombre**: El nombre visible de la aplicación
  - **Descripción**: Qué hace esta aplicación
  - **Categoría**: El propósito principal de la aplicación (configurable en Configuración del Panorama IT)
  - **Proveedor**: Vínculo a un proveedor de sus datos maestros
  - **Editor**: El editor del software
  - **Criticidad**: Crítica para el negocio, Alta, Media o Baja
  - **Ciclo de vida**: Estado actual (configurable en Configuración del Panorama IT)
  - **Puede tener apps hijas**: Active esto para usar esta aplicación como una "suite" que agrupa otras aplicaciones
  - **Licencia**: Términos y notas de licencia
  - **Notas**: Notas de texto libre

**Información de versión** (se muestra en una sección separada):
  - **Versión**: Identificador de versión actual (texto libre, p. ej., "4.2.1", "2023")
  - **Fecha de puesta en marcha**: Cuándo esta versión entró o entrará en producción
  - **Fin de soporte**: Cuándo finaliza el soporte del proveedor para esta versión
  - **Fecha de retiro**: Cuándo esta versión fue efectivamente decomisionada

**Historial de versiones**: Si esta aplicación fue creada desde otra versión (usando la función **Crear nueva versión**), aparece una línea de tiempo de versiones en la parte superior de la pestaña Visión general. Haga clic en cualquier chip de versión para navegar a esa versión.

**Pertenencia a suite**: Si una aplicación pertenece a una suite, verá la insignia de suite en la lista. El conmutador "Puede tener apps hijas" se desactiva cuando una aplicación pertenece a una suite padre -- elimine la relación de suite primero para reactivarlo.

---

### Instancias

La pestaña Instancias documenta dónde se ejecuta su aplicación en diferentes entornos.

**Entornos** (en orden): Producción, Pre-producción, QA, Test, Desarrollo, Sandbox

**Para cada instancia puede capturar**:
  - **URL base**: La URL de acceso para este entorno
  - **Región** / **Zona**: Información de despliegue geográfico
  - **Ciclo de vida**: Estado específico de la instancia (Activo, Obsoleto, etc.)
  - **SSO habilitado** / **MFA soportado**: Capacidades de autenticación
  - **Estado**: Habilitado o Deshabilitado
  - **Notas**: Notas específicas del entorno

**Acciones masivas**:
  - **Copiar desde Prod**: Crear rápidamente instancias para otros entornos basándose en su configuración de Producción
  - **Aplicar en lote**: Aplicar cambios a múltiples entornos a la vez

**Consejo**: Los cambios en instancias se guardan inmediatamente -- no es necesario hacer clic en el botón principal de Guardar.

---

### Servidores

La pestaña Servidores muestra qué activos de infraestructura soportan cada instancia de la aplicación.

**Cómo funciona**:
  - Seleccione un entorno para ver sus asignaciones de activos
  - Añada activos usando el botón **Añadir servidor**
  - Cada asignación captura el **Activo**, **Rol** (p. ej., Web, Base de datos, Aplicación) y **Notas** opcionales
  - Haga clic en el nombre de un activo para navegar al espacio de trabajo del Activo

**Consejo**: Asegúrese de que sus activos estén documentados en la página de Activos primero, luego vincúlelos aquí.

---

### Interfaces

La pestaña Interfaces muestra todas las integraciones donde esta aplicación participa -- ya sea como origen, destino o middleware.

**Qué verá**:
  - Interfaces agrupadas por entorno (Prod, Pre-prod, QA, etc.)
  - Para cada interfaz: **Nombre**, **Aplicación de origen**, **Aplicación de destino** e indicador de **Vía middleware**
  - Haga clic en cualquier nombre de interfaz o aplicación para navegar a su espacio de trabajo

**Consejo**: Las interfaces se gestionan desde la página de Interfaces. Esta pestaña proporciona una vista de solo lectura conveniente de todas las integraciones que involucran esta aplicación.

---

### Propiedad y audiencia

La pestaña Propiedad y audiencia documenta quién es responsable y quién usa esta aplicación.

**Responsables de negocio**: Las partes interesadas del negocio responsables de esta aplicación
  - Añada múltiples responsables; cada uno muestra su puesto de trabajo

**Responsables IT**: Los miembros del equipo IT responsables del soporte técnico
  - Añada múltiples responsables; cada uno muestra su puesto de trabajo

**Audiencia**: Qué partes de su organización usan esta aplicación
  - Seleccione una **Empresa** y opcionalmente un **Departamento**
  - El sistema calcula el número de usuarios basándose en las métricas de sus datos maestros (Usuarios IT o Plantilla)
  - Añada múltiples filas para capturar todas las audiencias

**Número de usuarios**: Elija entre:
  - **Derivado**: Calculado automáticamente a partir de las selecciones de Audiencia
  - **Manual**: Sobrescriba con un número específico

---

### Técnico y soporte

La pestaña Técnico y soporte captura detalles técnicos y contactos de soporte.

**Información técnica**:
  - **Suites**: Suites padre a las que pertenece esta aplicación
  - **Métodos de acceso**: Cómo acceden los usuarios a esta aplicación (selección múltiple). Las opciones son configurables en [Configuración del Panorama IT](it-ops-settings.md#access-methods). Las opciones predeterminadas incluyen:
    - Web
    - Aplicación instalada localmente
    - Aplicación móvil
    - HMI propietario (interfaz industrial)
    - Terminal / CLI
    - VDI / Escritorio remoto
    - Kiosk
  - **Acceso externo**: Si la aplicación es accesible desde internet
  - **Integración de datos / ETL**: Si la aplicación participa en pipelines de integración de datos

**Información de soporte**:
  - Añada contactos de soporte con su **Rol** (p. ej., Gestor de cuenta, Soporte técnico)
  - Los contactos se vinculan desde sus datos maestros de Contactos
  - Cada contacto muestra su **Correo**, **Teléfono** y **Móvil**
  - **Notas de soporte**: Notas de texto libre sobre los acuerdos de soporte

---

### Relaciones

La pestaña Relaciones vincula esta aplicación a sus datos financieros, de contratos y de proyectos.

**Vínculos disponibles**:
  - **Partidas OPEX**: Costes recurrentes asociados a esta aplicación
  - **Partidas CAPEX**: Proyectos de gasto de capital
  - **Contratos**: Contratos con proveedores
  - **Proyectos**: Proyectos del portafolio vinculados a esta aplicación
  - **Sitios web relevantes**: Enlaces externos y documentación
  - **Adjuntos**: Suba archivos arrastrando y soltando o con el selector de archivos. Se descargan haciendo clic en el chip del archivo.

**Si es una Suite**:
  - También verá una sección de **Componentes** listando las aplicaciones hijas
  - Gestione las aplicaciones hijas habilitando "Puede tener apps hijas" en la pestaña Visión general

---

### Base de conocimiento

La pestaña Base de conocimiento conecta esta aplicación con la base de conocimiento de su organización. Puede vincular documentos de conocimiento existentes o crear nuevos directamente desde el espacio de trabajo.

Esto es útil para adjuntar runbooks, decisiones de arquitectura, procedimientos operativos o cualquier documentación interna relacionada con la aplicación.

**Consejo**: Los documentos de conocimiento se comparten en toda la organización. Vincular uno aquí no restringe su visibilidad -- simplemente crea una referencia cruzada conveniente.

---

### Conformidad

La pestaña Conformidad captura información de protección de datos y normativa.

**Qué puede editar**:
  - **Clase de datos**: Nivel de sensibilidad (Público, Interno, Confidencial, Restringido)
  - **Última prueba DR**: Fecha de la prueba de recuperación ante desastres más reciente
  - **Contiene PII**: Si la aplicación almacena información de identificación personal
  - **Residencia de datos**: Países donde se almacenan los datos (selección múltiple)

**Consejo**: Las clases de datos son configurables en **Panorama IT > Configuración**. Personalícelas para que coincidan con la política de clasificación de datos de su organización.

---

## Gestión de versiones

KANAP ofrece **dos formas de gestionar versiones de aplicaciones**, dependiendo de cómo su organización maneja las actualizaciones:

| Enfoque | Ideal para | Qué sucede |
|---------|------------|------------|
| **Simple** | La mayoría de aplicaciones | Actualice los campos de versión en su lugar -- mismo registro, nuevo número de versión |
| **Sofisticado** | Migraciones mayores | Cree un nuevo registro de aplicación con seguimiento de linaje -- ejecute versiones antigua y nueva en paralelo |

### Seguimiento simple de versiones (actualizaciones in situ)

Para la mayoría de aplicaciones -- donde actualiza y la versión anterior simplemente desaparece -- solo actualice los campos de versión en la pestaña **Visión general**:
  - **Versión**: Introduzca la versión actual (p. ej., "4.2.1", "2023", "T1 2024")
  - **Fecha de puesta en marcha**: Cuándo esta versión entró o entrará en producción
  - **Fin de soporte**: Cuándo finaliza el soporte del proveedor
  - **Fecha de retiro**: Cuándo decomisionó realmente esta versión

Este enfoque mantiene todo en un solo registro. Cuando actualiza, modifique los campos de versión y listo. El historial se rastrea en el registro de auditoría.

**Use esto cuando**: las actualizaciones ocurren in situ sin solapamiento -- una versión reemplaza a otra.

### Crear una nueva versión (migraciones en paralelo)

Para actualizaciones mayores de aplicaciones donde necesita ejecutar versiones antigua y nueva en paralelo en diferentes entornos (p. ej., SAP S/4HANA 1909 en Prod mientras 2023 está en QA), use la función **Crear nueva versión**:

1. Abra la aplicación que desea actualizar
2. Guarde cualquier cambio pendiente (el botón está deshabilitado si tiene ediciones sin guardar)
3. Haga clic en **Crear nueva versión** en el encabezado
4. Complete el asistente de tres pasos:
   - **Paso 1 - Detalles de la versión**: Introduzca el nuevo nombre de la aplicación, versión y fechas
   - **Paso 2 - Opciones de copia**: Elija qué copiar del origen (responsables, empresas, departamentos, etc.)
   - **Paso 3 - Interfaces**: Seleccione qué interfaces migrar a la nueva versión
5. Haga clic en **Crear versión**

La nueva versión se crea como una aplicación separada con:
  - Un ciclo de vida **Propuesto** (listo para configurar antes de la puesta en marcha)
  - Un enlace al predecesor (mostrado en la línea de tiempo de versiones)
  - Datos copiados según sus selecciones
  - Interfaces duplicadas apuntando a la nueva versión

### Línea de tiempo de versiones

Cuando una aplicación tiene linaje de versiones (predecesor o sucesores), aparece una línea de tiempo de versiones en la parte superior de la pestaña **Visión general**:

  - Cada versión se muestra como un chip con su número de versión
  - La versión actual está resaltada
  - Las versiones retiradas aparecen con estilo tachado
  - Haga clic en cualquier chip para navegar a esa versión

### Qué se copia

Al crear una nueva versión, puede elegir copiar:
  - **Responsables** (Negocio e IT)
  - **Empresas** (Audiencia)
  - **Departamentos**
  - **Residencia de datos**
  - **Enlaces** (Documentación)
  - **Contactos de soporte**
  - **Partidas OPEX/CAPEX** - habilitado por defecto
  - **Contratos** - habilitado por defecto
  - **Instancias** (Entornos) - opcional, deshabilitado por defecto
  - **Enlaces de instancia** (conexiones de entorno) - opcional, solo disponible cuando Instancias está seleccionado

**No se copia** (debe configurarse de nuevo):
  - Pertenencia a suite
  - Adjuntos
  - Asignaciones de activos

### Migración de interfaces

Durante la creación de versiones, puede seleccionar interfaces específicas para migrar:
  - El asistente muestra todas las interfaces donde esta aplicación es el origen o destino
  - Las interfaces seleccionadas se duplican con referencias actualizadas a la nueva versión
  - Las interfaces originales permanecen vinculadas a la versión anterior
  - Cada interfaz migrada incluye todas sus relaciones: rutas, responsables, empresas, identificadores clave, enlaces y residencia de datos
  - La nueva interfaz comienza con un ciclo de vida "Propuesto"

**Copiar enlaces**: Si selecciona tanto "Instancias" como "Enlaces de instancia" en el Paso 2, los enlaces de interfaz también se copian:
  - Los enlaces se mapean a las instancias de la nueva aplicación (mismos entornos)
  - Los detalles específicos del entorno (endpoints, autenticación, nombres de trabajo) se borran para configuración nueva
  - El estado del enlace se restablece a "Propuesto"

**Aplicaciones ETL/Middleware**: Si la aplicación tiene "Integración de datos / ETL" habilitada, el asistente también muestra interfaces que *fluyen a través de* esta aplicación como middleware. Estas son interfaces donde otro origen envía datos a otro destino a través de su ETL. Copiar estas crea nuevas definiciones de interfaz para el ETL actualizado, con referencias de middleware debidamente actualizadas.

**Consejo**: Use esto al actualizar su ERP o ETL: migre las interfaces críticas y opcionalmente copie los enlaces para obtener una ventaja en la configuración del entorno.

---

## Copiar aplicaciones

Hay dos formas de copiar una aplicación en KANAP:

### Copiar elemento (desde la cuadrícula de Aplicaciones)

Utilice esto cuando desee crear un duplicado independiente de una aplicación -- típicamente para crear una entrada de aplicación similar sin linaje de versiones.

1. Seleccione una aplicación en la cuadrícula
2. Haga clic en **Copiar elemento**
3. El sistema crea una copia con " (copia)" añadido al nombre
4. Se le lleva a la nueva aplicación para hacer cambios

**Qué se copia**: Todos los campos principales (excepto fecha de última prueba DR), responsables, empresas, departamentos, suites, partidas OPEX/CAPEX, contratos, enlaces, residencia de datos y contactos de soporte.

**Qué NO se copia**: Instancias, interfaces, asignaciones de activos, adjuntos, campos de versión (versión, fecha de puesta en marcha, fin de soporte).

### Comparación: Copiar elemento vs Crear nueva versión

| Aspecto | Copiar elemento | Crear nueva versión |
|---------|-----------------|---------------------|
| **Propósito** | Crear duplicado independiente | Crear versión con linaje |
| **Opciones del usuario** | Ninguna (automático) | Asistente paso a paso |
| **Linaje** | Sin enlace a predecesor | Establece predecessor_id |
| **Ciclo de vida** | Preservado | Restablecido a Propuesto |
| **Nombre** | Sufijo " (copia)" | Especificado por el usuario |

**Qué se copia - Relaciones**:

| Relación | Copiar elemento | Crear nueva versión |
|----------|-----------------|---------------------|
| Responsables (negocio e IT) | Sí | Opcional (predeterminado: sí) |
| Empresas (audiencia) | Sí | Opcional (predeterminado: sí) |
| Departamentos | Sí | Opcional (predeterminado: sí) |
| Residencia de datos | Sí | Opcional (predeterminado: sí) |
| Enlaces (documentación) | Sí | Opcional (predeterminado: sí) |
| Contactos de soporte | Sí | Opcional (predeterminado: sí) |
| Suites (pertenencia) | Sí | No |
| Partidas OPEX | Sí | Opcional (predeterminado: sí) |
| Partidas CAPEX | Sí | Opcional (predeterminado: sí) |
| Contratos | Sí | Opcional (predeterminado: sí) |
| Instancias | No | Opcional (predeterminado: no) |
| Enlaces de instancia | No | Opcional (predeterminado: no) |
| Interfaces | No | Seleccionadas por el usuario |
| Asignaciones de activos | No | No |
| Adjuntos | No | No |

**Qué se copia - Campos principales**:

| Campo | Copiar elemento | Crear nueva versión |
|-------|-----------------|---------------------|
| Descripción | Sí | Sí |
| ETL habilitado | Sí | Sí |
| Notas de soporte | Sí | Sí |
| Última prueba DR | No | No |
| Campos de versión | No | Especificados por el usuario |
| Sobrescritura de usuarios | Sí | Restablecido a nulo |
| Año de usuarios | Sí | Restablecido al año actual |

---

## Importación/exportación CSV

Mantenga su inventario de aplicaciones a escala usando la importación y exportación CSV. Esta funcionalidad soporta operaciones masivas para carga inicial de datos, actualizaciones periódicas desde sistemas externos y extracción de datos para informes.

### Acceder a las funciones CSV

Desde la lista de Aplicaciones:
  - **Exportar CSV**: Descargar aplicaciones a un archivo CSV
  - **Importar CSV**: Subir un archivo CSV para crear o actualizar aplicaciones
  - **Descargar plantilla**: Obtener un CSV en blanco con los encabezados correctos

**Permisos requeridos**: `applications:admin` para operaciones de importación/exportación.

### Opciones de exportación

**Presets** (selecciones de campos preconfiguradas):

| Preset | Descripción |
|--------|-------------|
| **Exportación completa** | Todos los campos exportables incluidos datos calculados/solo lectura (marcas de tiempo, residencia de datos, métricas de usuarios) |
| **Enriquecimiento de datos** | Solo campos importables -- ideal para flujos de trabajo de edición de ida y vuelta |

**Exportación de plantilla**: Descarga solo encabezados -- útil para preparar archivos de importación con la estructura correcta. La plantilla incluye todos los campos importables.

**Selección personalizada**: Elija campos específicos para incluir en su exportación.

### Flujo de trabajo de importación

1. **Prepare su archivo**: Use codificación UTF-8 con separadores de punto y coma (`;`). Descargue una plantilla para asegurar encabezados correctos.

2. **Elija la configuración de importación**:
   - **Modo**:
     - `Enriquecer` (predeterminado): Las celdas vacías preservan los valores existentes -- solo actualiza lo que especifique
     - `Reemplazar`: Las celdas vacías borran los valores existentes -- reemplazo completo de todos los campos
   - **Operación**:
     - `Upsert` (predeterminado): Crear nuevas aplicaciones o actualizar las existentes
     - `Solo actualizar`: Solo modificar aplicaciones existentes, omitir nuevas
     - `Solo insertar`: Solo crear nuevas aplicaciones, omitir existentes

3. **Validar primero**: Haga clic en **Verificación previa** para validar su archivo sin hacer cambios. Revise errores y advertencias.

4. **Aplicar cambios**: Si la validación es correcta, haga clic en **Importar** para confirmar los cambios.

### Referencia de campos

**Campos de visión general**:

| Columna CSV | Descripción | Obligatorio | Notas |
|-------------|-------------|-------------|-------|
| `id` | UUID de la aplicación | No | Para actualizaciones; deje en blanco para nuevas aplicaciones |
| `name` | Nombre de la aplicación | Sí | Se usa como identificador único para coincidencias |
| `description` | Qué hace la aplicación | No | |
| `category` | Propósito principal | No | Acepta código o etiqueta de Configuración |
| `supplier_name` | Nombre del proveedor | No | Debe coincidir con un proveedor existente |
| `editor` | Editor del software | No | Texto libre (p. ej., Microsoft, SAP) |
| `criticality` | Importancia para el negocio | No | `business_critical`, `high`, `medium`, `low` |
| `lifecycle` | Estado actual | No | Acepta código o etiqueta de Configuración |
| `is_suite` | Puede tener apps hijas | No | `true` o `false` |
| `status` | Habilitado/deshabilitado | No | `enabled` o `disabled` |

**Campos de versión**:

| Columna CSV | Descripción | Notas |
|-------------|-------------|-------|
| `version` | Versión actual | Texto libre |
| `go_live_date` | Cuándo entró en producción | Formato de fecha: AAAA-MM-DD |
| `end_of_support_date` | Fin del soporte del proveedor | Formato de fecha: AAAA-MM-DD |
| `retired_date` | Fecha de decomisionamiento | Formato de fecha: AAAA-MM-DD |

**Campos técnicos**:

| Columna CSV | Descripción | Notas |
|-------------|-------------|-------|
| `access_methods` | Cómo acceden los usuarios | Códigos o etiquetas separados por comas de Configuración (p. ej., `web,mobile,vdi`) |
| `external_facing` | Accesible desde internet | `true` o `false` |
| `etl_enabled` | Integración de datos | `true` o `false` |
| `support_notes` | Información de soporte | Texto libre |
| `licensing` | Términos de licencia | Texto libre |
| `notes` | Notas internas | Texto libre |

**Campos de conformidad**:

| Columna CSV | Descripción | Notas |
|-------------|-------------|-------|
| `data_class` | Clasificación de datos | Acepta código o etiqueta de Configuración |
| `last_dr_test` | Fecha de última prueba DR | Formato de fecha: AAAA-MM-DD |
| `contains_pii` | Almacena datos personales | `true` o `false` |
| `data_residency` | Países de almacenamiento de datos | Solo exportación (códigos ISO) |

**Campos de responsables**:

| Columna CSV | Descripción | Notas |
|-------------|-------------|-------|
| `business_owner_email_1` hasta `_4` | Correos de responsables de negocio | Deben coincidir con usuarios existentes por correo |
| `it_owner_email_1` hasta `_4` | Correos de responsables IT | Deben coincidir con usuarios existentes por correo |

**Campos solo de exportación** (incluidos en Exportación completa pero no importables):

| Columna CSV | Descripción |
|-------------|-------------|
| `data_residency` | Países de almacenamiento de datos (códigos ISO, separados por comas) |
| `users_mode` | Método de conteo de usuarios (`manual`, `it_users`, `headcount`) |
| `users_year` | Año de referencia para cálculos de usuarios |
| `users_override` | Sobrescritura manual del conteo de usuarios |
| `created_at` | Marca de tiempo de creación del registro |
| `updated_at` | Marca de tiempo de última modificación |

### Aceptación de etiquetas y códigos

Para campos configurados en **Panorama IT > Configuración**, puede usar tanto el código interno como la etiqueta visible:

| Campo | Ejemplos de códigos | Ejemplos de etiquetas |
|-------|---------------------|----------------------|
| Categoría | `lob`, `productivity`, `security` | `Line-of-business`, `Productivity`, `Security` |
| Ciclo de vida | `active`, `proposed`, `deprecated` | `Active`, `Proposed`, `Deprecated` |
| Clase de datos | `public`, `internal`, `confidential` | `Public`, `Internal`, `Confidential` |

El sistema normaliza automáticamente los valores durante la importación, por lo que `Line-of-business`, `line-of-business` y `lob` se resuelven a la misma categoría.

### Coincidencia y actualizaciones

Las aplicaciones se emparejan por **nombre** (sin distinguir mayúsculas). Cuando se encuentra una coincidencia:
  - Con modo `Enriquecer`: Solo los valores CSV no vacíos actualizan la aplicación
  - Con modo `Reemplazar`: Todos los campos se actualizan, los valores vacíos borran datos existentes

Si incluye la columna `id` con un UUID válido, la coincidencia usa primero el ID, luego el nombre como respaldo.

### Limitaciones

  - **Instancias no incluidas**: Las instancias de entorno (Prod, QA, Dev) requieren configuración en el espacio de trabajo
  - **Asignaciones de activos excluidas**: Los enlaces a servidores deben configurarse en la pestaña Servidores
  - **Interfaces excluidas**: Las definiciones de integración no son parte de la importación/exportación CSV
  - **Máximo 4 responsables por tipo**: Se pueden importar/exportar hasta 4 responsables de negocio y 4 responsables IT
  - **Métricas de usuarios solo de exportación**: Los campos de audiencia y conteo de usuarios (`users_mode`, `users_year`, `users_override`) se gestionan en el espacio de trabajo
  - **Residencia de datos solo de exportación**: Las selecciones de países deben gestionarse en la pestaña Conformidad

### Solución de problemas

**Error "El archivo no tiene el formato correcto"**: Esto generalmente indica un problema de codificación. Asegúrese de que su CSV esté guardado como **UTF-8**:

  - **En LibreOffice**: Al abrir un CSV, seleccione `UTF-8` en el desplegable de Juego de caracteres (no "Japanese (Macintosh)" u otras codificaciones). Al guardar, marque "Editar configuración de filtro" y elija UTF-8.
  - **En Excel**: Guardar como > CSV UTF-8 (delimitado por comas), luego abra en un editor de texto para cambiar comas por puntos y coma.
  - **Consejo general**: Si ve caracteres ilegibles (`?¿`, `ï»¿`) al inicio de su archivo, la codificación es incorrecta.

### Ejemplo CSV

```csv
name;category;supplier_name;criticality;lifecycle;go_live_date;external_facing
Salesforce CRM;Line-of-business;Salesforce Inc;business_critical;Active;2020-01-15;true
Microsoft 365;Productivity;Microsoft;high;active;2019-06-01;false
Custom ERP;lob;;medium;Active;2018-03-20;false
```

---

## Consejos

  - **Empiece por las apps críticas**: Documente primero sus aplicaciones críticas para el negocio, luego avance en los niveles de criticidad.
  - **Use Suites para agrupar**: Marque una aplicación como Suite para agrupar componentes relacionados (p. ej., módulos SAP bajo una Suite SAP).
  - **Vincule al gasto temprano**: Conecte partidas OPEX y CAPEX en la pestaña Relaciones para ver el panorama completo de costes.
  - **Mantenga los entornos actualizados**: La pestaña Instancias alimenta los chips de entorno en la lista -- manténgala actualizada para una visibilidad precisa.
  - **Aproveche el filtrado por categoría**: Utilice el filtro de columna Categoría para centrarse en tipos específicos de aplicaciones (p. ej., mostrar solo apps de Línea de negocio, o excluir herramientas de Productividad).
  - **Adjunte conocimiento temprano**: Vincule runbooks y documentos de arquitectura en la pestaña Base de conocimiento para que el equipo sepa dónde buscar durante los incidentes.

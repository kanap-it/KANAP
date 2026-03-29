# CAPEX

Las partidas CAPEX (gasto de capital) son sus inversiones en activos a largo plazo: compras de hardware, licencias de software con valor plurianual, proyectos de infraestructura y equipamiento. Aquí es donde planifica los presupuestos de capital, hace seguimiento del gasto de proyectos y asigna costes en toda su organización.

El espacio de trabajo CAPEX le ayuda a gestionar cada partida de capital desde la presupuestación inicial hasta la ejecución y los informes -- todo en un solo lugar con columnas presupuestarias año a año, métodos flexibles de asignación y vínculos directos a proyectos, contratos y contactos.

## Primeros pasos

Navegue a **Gestión presupuestaria > CAPEX** para ver su lista. Haga clic en **Nuevo** para crear su primera partida.

**Campos obligatorios**:

- **Descripción**: En qué está invirtiendo (p. ej., "Nueva infraestructura de servidores", "Licencia de software ERP")
- **Tipo PP&E**: Clasificación de Propiedad, Planta y Equipamiento -- Hardware o Software
- **Tipo de inversión**: Propósito de la inversión (ver opciones a continuación)
- **Prioridad**: Nivel de prioridad de negocio (ver opciones a continuación)
- **Moneda**: Código ISO (p. ej., USD, EUR). Se establece por defecto a la moneda CAPEX de su espacio de trabajo; puede sobrescribirla por partida
- **Inicio efectivo**: Cuándo comienza esta inversión (DD/MM/AAAA)
- **Empresa pagadora**: Qué empresa realiza la inversión (obligatorio para contabilidad)

**Muy recomendados**:

- **Cuenta**: La cuenta contable para este gasto de capital. Solo aparecen cuentas del plan de cuentas de la empresa pagadora
- **Proveedor**: El proveedor de esta inversión. Seleccione de sus proveedores de datos maestros

**Opcionales pero útiles**:

- **Fin efectivo**: Cuándo termina la vida útil de este activo o se completa el proyecto (deje en blanco para activos sin fin definido)
- **Notas**: Notas internas de texto libre sobre la inversión

Una vez que guarde, el espacio de trabajo desbloquea todas las pestañas: **Visión general**, **Presupuesto**, **Asignaciones**, **Tareas** y **Relaciones**.

**Consejo**: Puede crear partidas rápidamente y completar presupuestos y asignaciones más tarde. Comience con lo esencial e itere.

---

## Tipos de inversión

Las partidas CAPEX deben clasificarse por tipo de inversión. Esto ayuda a analizar los patrones de gasto de capital:

- **Reemplazo**: Reemplazar activos existentes obsoletos o al final de su vida útil
- **Capacidad**: Añadir capacidad para soportar el crecimiento del negocio o una demanda creciente
- **Productividad**: Mejorar la eficiencia o reducir costes operativos
- **Seguridad**: Reforzar la postura de seguridad, la conformidad o la mitigación de riesgos
- **Conformidad**: Cumplir requisitos regulatorios o de conformidad
- **Crecimiento de negocio**: Habilitar nuevos productos, mercados o capacidades de negocio
- **Otro**: Inversiones que no encajan en las categorías anteriores

**Niveles de prioridad**:

- **Obligatorio**: Debe hacerse (regulatorio, infraestructura crítica, seguridad)
- **Alto**: Caso de negocio sólido, alto ROI o importancia estratégica
- **Medio**: Valioso pero puede aplazarse si es necesario
- **Bajo**: Deseable, puede posponerse

---

## Trabajar con la lista CAPEX

La lista CAPEX (en **Gestión presupuestaria > CAPEX**) es su vista principal para navegar, filtrar y explorar partidas de capital.

### Columnas predeterminadas

| Columna | Qué muestra |
|---------|-------------|
| **Descripción** | Nombre de la inversión |
| **Empresa** | Empresa pagadora |
| **Tipo PP&E** | Hardware o Software |
| **Tipo de inversión** | Propósito de la inversión |
| **Prioridad** | Nivel de prioridad de negocio |
| **Asignación Y** | Etiqueta del método de asignación del año actual |
| **Presupuesto Y** | Presupuesto de capital planificado del año actual (moneda de reporte) |
| **Aterrizaje Y** | Gasto de capital real final del año actual (moneda de reporte) |
| **Presupuesto Y+1** | Presupuesto de capital planificado del año siguiente (moneda de reporte) |

### Columnas adicionales

Estas columnas están ocultas por defecto. Muéstrelas desde el selector de columnas (menú hamburguesa en el encabezado de la cuadrícula):

| Columna | Qué muestra |
|---------|-------------|
| **Asignación Y+1** | Etiqueta del método de asignación del año siguiente |
| **Aterrizaje Y-1** | Gasto de capital real final del año anterior |
| **Moneda** | Código de moneda de la partida |
| **Inicio** | Fecha de inicio efectivo |
| **Fin** | Fecha de fin efectivo |
| **Notas** | Notas de texto libre |
| **Tarea** | Título de la tarea más reciente vinculada a esta partida |
| **Habilitado** | Estado (habilitado o deshabilitado) |

### Búsqueda rápida

El cuadro de búsqueda en la parte superior busca en descripción, notas, tipo PP&E, tipo de inversión, prioridad, moneda y estado. Los resultados se actualizan en tiempo real mientras escribe.

### Filtros de columna

Cada encabezado de columna filtrable tiene un icono de filtro. **Empresa**, **Tipo PP&E**, **Tipo de inversión**, **Prioridad** y **Moneda** usan filtros de conjunto de casillas con **Todos**, **Ninguno** y un botón de limpiar. Múltiples filtros se combinan con lógica AND.

### Ordenación

Haga clic en un encabezado de columna para ordenar ascendente o descendente. La lista recuerda su última ordenación cuando regresa.

### Fila de totales

La fila fijada en la parte inferior muestra totales para todas las columnas presupuestarias. Los totales respetan sus filtros y búsqueda actuales. Todos los importes se convierten a su moneda de reporte, mostrada en el título de la página (p. ej., "CAPEX (EUR)").

### Enlace directo

Haga clic en cualquier celda de una fila para abrir el espacio de trabajo en la pestaña más relevante para esa columna:

- **Descripción**, **Empresa**, **Tipo PP&E**, **Tipo de inversión**, **Prioridad**: Abre **Visión general**
- **Presupuesto Y**, **Aterrizaje Y**: Abre la pestaña **Presupuesto** para el año actual
- **Aterrizaje Y-1**: Abre la pestaña **Presupuesto** para el año anterior
- **Presupuesto Y+1**: Abre la pestaña **Presupuesto** para el año siguiente
- **Asignación Y**: Abre la pestaña **Asignaciones** para el año actual
- **Asignación Y+1**: Abre la pestaña **Asignaciones** para el año siguiente
- **Tarea**: Abre la pestaña **Tareas**

### Filtro de estado

Utilice el conmutador **Mostrar: Habilitados / Deshabilitados / Todos** encima de la cuadrícula para controlar el alcance del ciclo de vida (predeterminado: **Habilitados**). Seleccione **Deshabilitados** para revisar inversiones archivadas o **Todos** para incluir ambos estados. Los totales se actualizan inmediatamente.

### Preservación del contexto de búsqueda

Su contexto de lista -- orden de clasificación, texto de búsqueda y filtros activos -- se preserva cuando abre una partida y se restaura al volver a la lista. Esto significa que puede profundizar en varias partidas en secuencia sin perder su lugar.

### Navegación Anterior/Siguiente

Cuando abre una partida, el espacio de trabajo muestra botones **Anterior** y **Siguiente**. Estos navegan por la lista en el orden actual, respetando filtros y búsqueda. El contador (p. ej., "Partida 3 de 47") muestra su posición en la lista filtrada.

**Consejo**: Utilice filtros de columna y búsqueda rápida para construir vistas enfocadas (p. ej., "Todas las inversiones en hardware con prioridad alta"), luego navegue partida por partida con **Anterior**/**Siguiente** para revisar presupuestos.

---

## El espacio de trabajo CAPEX

Haga clic en cualquier fila de la lista para abrir el espacio de trabajo. Tiene cinco pestañas, cada una enfocada en un aspecto específico de la partida de capital.

### Visión general

Esta pestaña muestra toda la información general de la partida CAPEX.

**Qué puede editar**:

- **Descripción**: En qué está invirtiendo (texto multilínea)
- **Empresa pagadora**: Autocompletado desde sus Empresas
- **Cuenta**: Filtrada por el plan de cuentas de la empresa pagadora
- **Proveedor**: Autocompletado desde sus proveedores de datos maestros
- **Tipo PP&E**: Hardware o Software
- **Tipo de inversión**: Reemplazo, Capacidad, Productividad, Seguridad, Conformidad, Crecimiento de negocio u Otro
- **Prioridad**: Obligatorio, Alto, Medio o Bajo
- **Moneda**: Se establece por defecto a la moneda CAPEX del espacio de trabajo; muestra solo monedas permitidas
- **Inicio efectivo** y **Fin efectivo**: Campos de fecha en formato DD/MM/AAAA
- **Notas**: Notas internas de texto libre

**Estado y ciclo de vida**:

- Utilice el conmutador **Habilitado** o establezca una **Fecha de desactivación** para controlar cuándo aparece la partida en informes y listas de selección
- Las partidas deshabilitadas se excluyen de informes para años estrictamente posteriores a la fecha de desactivación
- Los datos históricos permanecen intactos; seguirá viendo partidas deshabilitadas en informes que cubren años cuando estaban activas

**Guardar y Restablecer**:

- Los cambios **no** se guardan automáticamente
- Haga clic en **Guardar** para persistir sus ediciones, o **Restablecer** para descartarlas
- Si intenta navegar fuera con cambios sin guardar, se le solicitará que guarde o descarte

**Consejo**: Si ve una advertencia de "cuenta obsoleta", significa que la cuenta seleccionada no pertenece al plan de cuentas de la empresa pagadora. Elija una cuenta diferente para resolver la advertencia.

---

### Presupuesto

La pestaña Presupuesto es donde introduce datos financieros por año. Soporta múltiples columnas presupuestarias y dos modos de entrada: **Totales planos** (total anual) y **Manual por mes** (desglose de 12 meses).

**Selección de año**:

- Utilice las pestañas de año en la parte superior para alternar entre Y-2, Y-1, Y (año actual), Y+1 e Y+2
- Cada año tiene su propia versión, método de asignación e importes
- Cambiar de año con cambios sin guardar muestra un diálogo de guardar/descartar

**Columnas presupuestarias** (todos los años):

- **Presupuesto**: Presupuesto de capital planificado inicial
- **Revisión**: Actualización presupuestaria a mitad de año (p. ej., después de cambios de alcance o reprevisiones)
- **Seguimiento**: Gasto real esperado (su mejor estimación a medida que avanza el año)
- **Aterrizaje previsto**: Gasto de capital real final después del cierre de fin de año

**Modo Plano vs Manual por mes**:

- **Totales planos**: Introduzca un total por columna; los importes se distribuyen uniformemente en 12 meses para fines de asignación
- **Manual por mes**: Introduzca importes por mes (Ene a Dic) para un seguimiento granular del gasto del proyecto
- Alterne entre modos usando los botones de radio en la parte superior de la pestaña
- Al cambiar de modo, el sistema calcula valores mensuales desde el total plano (distribución igualitaria) o suma los valores mensuales de vuelta a un total plano

**Comportamiento de congelación**:

- Si el presupuesto de un año está congelado (vía Administración presupuestaria), las entradas están deshabilitadas y muestran una etiqueta "congelado"
- Puede ver datos congelados; los administradores pueden descongelar vía **Gestión presupuestaria > Administración > Congelar/Descongelar**

**Eliminar y redistribuir** (solo modo manual por mes):

- Haga clic en el icono de eliminar junto a un mes para poner ese mes a cero y redistribuir su valor entre los otros meses desbloqueados
- Útil para eliminar meses de marcador de posición o ajustar cronogramas de proyecto
- Los meses bloqueados (previamente eliminados en esta sesión) se excluyen de la redistribución

**Campo de Notas**:

- Cada versión presupuestaria anual tiene un campo de **Notas** para comentarios específicos del año (p. ej., "Aplazado a T2 debido a retrasos del proveedor")

**Cómo usarlo**:

1. Seleccione el año que está planificando
2. Elija modo Totales planos o Manual por mes
3. Complete las columnas relevantes (Presupuesto para planificación inicial, Seguimiento para monitorización, Aterrizaje previsto para realizado)
4. Haga clic en **Guardar** para persistir sus cambios

**Consejo**: Para la mayoría de partidas, el modo plano es más rápido. Utilice el modo manual por mes cuando necesite hacer seguimiento del ritmo del gasto de proyectos o despliegues por fases.

---

### Asignaciones

La pestaña Asignaciones distribuye el gasto de capital entre sus empresas y departamentos. Esto alimenta los informes de contracargo y ayuda a asignar los costes de los activos.

**Selección de año**:

- Funciona igual que Presupuesto: utilice las pestañas de año para alternar entre Y-2, Y-1, Y, Y+1, Y+2
- Cada año puede tener un método de asignación diferente

**Métodos de asignación**:

1. **Plantilla (Predeterminado)**: Divide el gasto de capital proporcionalmente según la plantilla de cada empresa para el año seleccionado. Requiere que todas las empresas activas tengan plantilla > 0. Los porcentajes se actualizan automáticamente al editar las métricas de la empresa.

2. **Usuarios IT**: Divide el gasto proporcionalmente según el conteo de usuarios IT de cada empresa para el año seleccionado. Útil para inversiones en infraestructura IT que escalan con el personal IT.

3. **Facturación**: Divide el gasto proporcionalmente según la facturación (ingresos) de cada empresa para el año seleccionado. Útil para plataformas de negocio amplias o infraestructura.

4. **Manual por empresa**: Usted selecciona qué empresas reciben esta inversión de capital. Elija un factor (Plantilla, Usuarios IT o Facturación) para calcular porcentajes entre las empresas seleccionadas. Solo las empresas seleccionadas se incluyen en la distribución. El sistema prerellena automáticamente todas las empresas habilitadas en el primer uso; elimine las empresas que no se benefician de esta inversión.

5. **Manual por departamento**: Usted selecciona pares específicos de empresa/departamento. Los porcentajes se calculan según la plantilla de cada departamento. Útil cuando una inversión de capital beneficia solo a ciertos departamentos (p. ej., equipamiento de fabricación).

**Cómo funcionan los porcentajes**:

- Para **métodos automáticos** (Plantilla, Usuarios IT, Facturación): los porcentajes se calculan en cada carga de página desde las métricas más recientes de la empresa. No los edita directamente.
- Para **métodos manuales**: usted selecciona las empresas o departamentos, y el sistema calcula porcentajes basándose en el factor elegido y las métricas actuales.
- Los porcentajes reflejan datos en vivo. Si actualiza la plantilla de una empresa, las asignaciones se recalculan inmediatamente.

**Ver asignaciones**:

- La cuadrícula muestra: Empresa, Departamento (si aplica), Porcentaje
- El porcentaje total debe ser 100%; aparecen advertencias si faltan métricas o la suma es cero

**Cómo usarlo**:

1. Seleccione el año
2. Elija un método de asignación del desplegable
3. Si usa un método manual, seleccione las empresas o departamentos (elimine los que no se benefician de esta inversión)
4. Haga clic en **Guardar** para persistir el método y la selección

**Problemas comunes**:

- **Error "Métricas faltantes"**: Una o más empresas tienen plantilla/usuarios IT/facturación cero o faltantes para el año seleccionado. Complete las métricas en **Datos maestros > Empresas** (pestaña Detalles).
- **"El total no es 100%"**: Generalmente causado por métricas faltantes. Corrija los datos de la empresa y recargue las asignaciones.

**Consejo**: Utilice Plantilla para la mayoría de partidas (es lo más simple y se actualiza automáticamente). Reserve Manual por empresa para inversiones que benefician solo a entidades específicas (p. ej., centro de datos regional). Utilice Manual por departamento para inversiones muy dirigidas.

---

### Tareas

La pestaña Tareas le ayuda a hacer seguimiento de pendientes y seguimientos relacionados con esta partida CAPEX (p. ej., "Selección de proveedor antes de T2", "Completar instalación en junio", "Obtener aprobación del consejo").

**Lista de tareas**:

- Muestra todas las tareas vinculadas a esta partida CAPEX
- Columnas: Título, Estado, Prioridad, Fecha de vencimiento, Acciones
- Haga clic en el título de una tarea para abrir el espacio de trabajo completo de tareas
- El filtro predeterminado muestra tareas activas (oculta completadas y canceladas)

**Filtrado**:

- Haga clic en el icono de filtro para mostrar/ocultar controles de filtro
- **Filtro de estado**: Todos, Activos (oculta completados/cancelados), o un estado específico
- Haga clic en el botón de limpiar para restablecer filtros

**Crear una tarea**:

- Haga clic en **Añadir tarea** para abrir el espacio de trabajo de creación de tareas
- La tarea se vincula automáticamente a esta partida CAPEX
- Complete el título, descripción, prioridad, asignado y fecha de vencimiento en el espacio de trabajo de tareas

**Eliminar una tarea**:

- Haga clic en el icono de eliminar en la columna de Acciones
- Confirme la eliminación en el diálogo

**Notas**:

- Las tareas son objetos independientes con sus propios permisos (`tasks:member` para crear/editar)
- Tener acceso de gestor CAPEX no otorga automáticamente derechos de edición de tareas; consulte con su administrador si no puede crear tareas
- Las tareas también se pueden ver y gestionar desde **Portafolio > Tareas**, que muestra todas las tareas de su organización
- El título de la última tarea también se muestra en la columna **Tarea** de la vista de lista (oculta por defecto)

**Consejo**: Utilice tareas para capturar elementos de acción durante la planificación de capital o los ciclos de aprobación. Establezca fechas de vencimiento para hacer seguimiento de los hitos de adquisición y plazos de implementación.

---

### Relaciones

La pestaña Relaciones vincula esta partida CAPEX a objetos relacionados: Proyectos, Contratos, Contactos, Sitios web relevantes y Adjuntos.

**Proyectos**:

- Utilice el autocompletado para vincular uno o más proyectos
- Esto ayuda a agrupar el gasto de capital por proyecto en informes y permite la contabilidad de proyectos
- Elimine un proyecto haciendo clic en la X de su chip, luego guarde

**Contratos**:

- Utilice el autocompletado para vincular uno o más contratos
- Cuando están vinculados, el nombre del contrato aparece como referencia rápida
- Los contratos también pueden vincularse a múltiples partidas CAPEX (relación de muchos a muchos)
- Elimine contratos haciendo clic en la X del chip, luego guarde

**Contactos**:

- Vincule contactos a esta partida CAPEX con un rol: **Comercial**, **Técnico**, **Soporte** u **Otro**
- Haga clic en **Añadir** para seleccionar un contacto de sus datos maestros y asignar un rol
- Los contactos heredados del proveedor se muestran con un chip relleno; los contactos añadidos manualmente muestran un chip delineado
- Haga clic en una fila de contacto para abrir el espacio de trabajo del contacto
- Elimine un contacto haciendo clic en el icono de eliminar en la columna de Acciones

**Sitios web relevantes**:

- Añada URLs relacionadas con esta inversión (p. ej., páginas de producto del proveedor, documentación técnica, wikis internas)
- Cada enlace tiene un campo de **Descripción** opcional para contexto
- Haga clic en **Añadir URL** para añadir más enlaces
- Los enlaces se guardan cuando hace clic en **Guardar** en la parte superior del espacio de trabajo

**Adjuntos**:

- Suba archivos relacionados con esta partida de capital (p. ej., presupuestos, propuestas de proveedores, especificaciones técnicas, memorandos de aprobación)
- Arrastre y suelte archivos en el área de adjuntos, o haga clic en **Seleccionar archivos** para navegar
- Todos los archivos se almacenan de forma segura y pueden descargarse haciendo clic en el nombre del archivo
- Elimine adjuntos haciendo clic en la X del chip del archivo (requiere permiso `capex:manager`)
- Los adjuntos se guardan inmediatamente al subirlos (no es necesario hacer clic en Guardar)

**¿Por qué vincular?**:

- **Proyectos**: Acumule gasto de capital por proyecto para contabilidad de proyectos e informes
- **Contratos**: Haga seguimiento de qué partidas de capital están cubiertas por acuerdos de compra o contratos de servicio
- **Contactos**: Mantenga los datos de contacto de proveedores y partes interesadas asociados a la inversión
- **Sitios web y adjuntos**: Centralice toda la documentación e referencias relacionadas con la inversión para fácil acceso

**Consejo**: Suba presupuestos de proveedores, memorandos de aprobación y especificaciones técnicas como adjuntos. Vincule contratos para el seguimiento de adquisiciones. Utilice contactos para mantener a los representantes de proveedores asociados con cada partida de capital.

---

## Importación/exportación CSV

Puede cargar masivamente partidas CAPEX vía CSV para acelerar la configuración inicial o sincronizar con sistemas externos.

**Exportar**:

1. Haga clic en **Exportar CSV** en la lista CAPEX
2. Elija:
   - **Plantilla**: Solo encabezados (úselo para crear un CSV en blanco para rellenar)
   - **Datos**: Todas las partidas CAPEX actuales con presupuestos para Y-1, Y e Y+1

**Estructura del CSV**:

- Delimitador: punto y coma `;` (no coma)
- Codificación: UTF-8 (guarde como "CSV UTF-8" en Excel)
- Encabezados: `description;ppe_type;investment_type;priority;currency;effective_start;effective_end;status;disabled_at;notes;company_name;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Importar**:

1. Haga clic en **Importar CSV** en la lista CAPEX
2. Suba su archivo CSV (arrastrar y soltar o selector de archivos)
3. Haga clic en **Verificación previa** para validar:
   - Los encabezados coinciden exactamente
   - Las empresas existen en su espacio de trabajo
   - Los campos obligatorios (description, ppe_type, investment_type, priority, currency, effective_start, company_name) están presentes
   - No hay descripciones duplicadas
4. Revise el informe de verificación previa (muestra conteos y hasta 5 errores de ejemplo)
5. Si es correcto, haga clic en **Cargar** para importar

**Notas importantes**:

- **Clave única**: Las partidas CAPEX se identifican por `description`. Si una descripción ya existe, se **omite** (sin actualizaciones).
- **Solo inserción**: El importador solo crea nuevas partidas; no actualizará las existentes. Utilice la interfaz para editar partidas existentes.
- **Referencias**: `company_name` debe coincidir con una empresa por nombre (sin distinguir mayúsculas).
- **Tipo PP&E**: Debe ser `hardware` o `software` (sin distinguir mayúsculas).
- **Tipo de inversión**: Debe ser uno de: `replacement`, `capacity`, `productivity`, `security`, `conformity`, `business_growth`, `other` (sin distinguir mayúsculas).
- **Prioridad**: Debe ser `mandatory`, `high`, `medium` o `low` (sin distinguir mayúsculas).
- **Presupuestos**: Las columnas presupuestarias rellenan las versiones Y-1, Y e Y+1. Los importes se distribuyen uniformemente en 12 meses (modo plano).

**Errores comunes**:

- **"Empresa no encontrada"**: Cree la empresa en **Datos maestros > Empresas** primero, luego reimporte.
- **"Tipo PP&E inválido"**: Utilice `hardware` o `software` exactamente.
- **"Tipo de inversión inválido"**: Utilice uno de los 7 tipos válidos (ver lista arriba).
- **"Prioridad inválida"**: Utilice `mandatory`, `high`, `medium` o `low`.
- **"Moneda inválida"**: Utilice códigos ISO de 3 letras (USD, EUR, GBP) que estén permitidos en la configuración de monedas de su espacio de trabajo.
- **"Desajuste de encabezados"**: Descargue una plantilla nueva; los encabezados deben coincidir exactamente (incluido el orden).

**Consejo**: Comience con la exportación de plantilla, rellene algunas filas y ejecute una verificación previa para detectar problemas temprano. Corrija errores en el CSV y vuelva a subirlo hasta que la verificación previa pase, luego cargue.

---

## Estado y ciclo de vida

Cada partida CAPEX tiene un **estado** (Habilitado o Deshabilitado) y una **Fecha de desactivación** opcional que controla cuándo aparece en informes y listas de selección.

**Cómo funciona**:

- **Habilitado**: La partida está activa y aparece en todas partes (listas, informes, asignaciones)
- **Fecha de desactivación**: Cuando se establece, la partida se desactiva al final de ese día
- Después de la fecha de desactivación:
  - La partida ya no aparece en listas de selección para nuevos contratos o asignaciones
  - Se excluye de informes para años estrictamente posteriores a la fecha de desactivación
  - Los datos históricos permanecen intactos; la partida sigue apareciendo en informes que cubren años cuando estaba activa

**Establecer estado**:

- En la pestaña **Visión general**, utilice el conmutador **Habilitado** o establezca una **Fecha de desactivación**
- Puede programar una fecha de desactivación futura (útil para disposiciones de activos planificadas o fechas de fin de vida)

**Ver partidas deshabilitadas**:

- Por defecto, la lista CAPEX muestra solo partidas **Habilitadas**
- Utilice el conmutador **Mostrar: Habilitados / Deshabilitados / Todos** para cambiar el alcance

**Cuándo desactivar vs eliminar**:

- **Prefiera desactivar**: Mantiene el historial intacto, asegura que los informes permanezcan consistentes y soporta registros de auditoría
- **Elimine solo si**: La partida se creó por error y no tiene presupuestos, asignaciones ni tareas
- La eliminación está protegida: no puede eliminar una partida que tiene datos presupuestarios, asignaciones, tareas o está referenciada por contratos

**Consejo**: Utilice la Fecha de desactivación para marcar activos que han sido completamente depreciados, eliminados o proyectos completados. No elimine a menos que sea un verdadero error.

---

## Permisos

El acceso a CAPEX se controla por tres niveles:

- `capex:reader` -- Ver la lista CAPEX, abrir partidas, ver presupuestos y asignaciones (solo lectura)
- `capex:manager` -- Crear y editar partidas CAPEX, actualizar presupuestos y asignaciones, subir adjuntos, gestionar enlaces y contactos
- `capex:admin` -- Todos los derechos de gestor más importación CSV, operaciones presupuestarias (congelar, copiar, restablecer) y eliminación masiva

Adicionalmente:

- Las tareas tienen permisos separados (`tasks:member` para crear/editar tareas en partidas CAPEX)
- Los usuarios con `tasks:reader` pueden ver tareas pero no crear ni editar

Si no puede realizar una acción (p. ej., falta el botón **Importar CSV**), consulte con su administrador del espacio de trabajo para revisar sus permisos de rol.

---

## Consejos

- **Empiece simple**: Cree partidas con solo lo esencial (descripción, tipo PP&E, tipo de inversión, empresa), luego añada presupuestos y asignaciones a medida que planifica.
- **Use asignación por Plantilla**: Para la mayoría de inversiones de capital, Plantilla es suficiente. Reserve asignaciones manuales para inversiones que benefician solo a empresas o departamentos específicos.
- **Vincule contratos**: Si gestiona compras de capital mediante contratos, vincúlelos en la pestaña Relaciones para el seguimiento de adquisiciones.
- **Suba documentación**: Utilice la funcionalidad de adjuntos para almacenar presupuestos de proveedores, memorandos de aprobación y especificaciones técnicas junto a la partida.
- **Clasifique con precisión**: Utilice Tipo de inversión y Prioridad consistentemente para habilitar análisis significativos del gasto de capital y la priorización.
- **Mantenga actualizadas las métricas de empresa**: Las asignaciones dependen de la plantilla, usuarios IT y facturación de la empresa. Las métricas desactualizadas causan errores de asignación.
- **Use CSV para configuración masiva**: Si está migrando desde otro sistema o tiene muchas partidas de capital, comience con importación CSV.
- **Desactive, no elimine**: Preserve el historial desactivando partidas cuando los activos se eliminen o los proyectos se completen.
- **Revise la fila de totales**: Antes de finalizar presupuestos de capital, verifique la fila de totales fijada para asegurar que su gasto de capital suma como se espera.
- **Use enlace directo**: Haga clic directamente en una columna de presupuesto o asignación en la lista para ir directamente a esa pestaña y año.
- **Haga seguimiento del ritmo de gasto**: Para proyectos grandes con gasto por fases, utilice el modo manual por mes para hacer seguimiento del gasto contra los hitos del proyecto.
- **Congele después del cierre de año**: Utilice Administración presupuestaria para congelar los presupuestos del año anterior una vez que el realizado esté finalizado, previniendo ediciones accidentales.

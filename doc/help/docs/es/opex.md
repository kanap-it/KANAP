# OPEX

Las partidas OPEX (gasto operativo) son sus costes IT recurrentes: licencias de software, suscripciones cloud, contratos de mantenimiento y servicios. Aquí es donde planifica presupuestos, hace seguimiento del realizado y asigna costes en toda su organización.

El espacio de trabajo OPEX le ayuda a gestionar cada partida de gasto desde la presupuestación inicial hasta la ejecución y los informes -- todo en un solo lugar con columnas presupuestarias año a año, métodos flexibles de asignación y vínculos directos a proveedores, contratos, aplicaciones y proyectos.

## Primeros pasos

Navegue a **Gestión presupuestaria > OPEX** para ver su lista. Haga clic en **Nuevo** para crear su primera partida.

**Campos obligatorios**:
  - **Nombre del producto**: En qué está gastando (p. ej., "Licencias Salesforce", "AWS Compute")
  - **Proveedor**: A quién paga. Se vincula a sus datos maestros de Proveedores
  - **Moneda**: Código ISO (p. ej., USD, EUR). Se establece por defecto a la moneda de su espacio de trabajo; puede sobrescribirla por partida
  - **Empresa pagadora**: Qué empresa paga al proveedor (obligatorio para contabilidad)
  - **Cuenta**: La cuenta contable para este gasto. Solo aparecen cuentas del plan de cuentas de la empresa pagadora
  - **Inicio efectivo**: Cuándo comienza este gasto (DD/MM/AAAA)

**Opcionales pero útiles**:
  - **Descripción**: Contexto adicional o notas sobre el gasto
  - **Fin efectivo**: Cuándo termina este gasto (deje en blanco para partidas continuas)
  - **Responsable IT** / **Responsable de negocio**: Quién es responsable
  - **Categoría analítica**: Agrupación personalizada para informes (p. ej., "Infraestructura", "Apps de negocio"). Se pueden crear nuevas categorías sobre la marcha
  - **Notas**: Notas internas de texto libre

Una vez que guarde, el espacio de trabajo desbloquea todas las pestañas: **Visión general**, **Presupuesto**, **Asignaciones**, **Tareas** y **Relaciones**.

**Consejo**: Puede crear partidas rápidamente y completar presupuestos y asignaciones más tarde. Comience con lo esencial e itere.

---

## Trabajar con la lista OPEX

La lista OPEX (en **Gestión presupuestaria > OPEX**) es su vista principal para navegar, filtrar y explorar partidas de gasto.

**Columnas predeterminadas**:
  - **Nombre del producto**: El nombre de la partida (enlaza a la pestaña Visión general)
  - **Proveedor**: El nombre del proveedor
  - **Empresa pagadora**: Qué empresa paga esta partida
  - **Contrato**: El nombre del último contrato vinculado (enlaza al espacio de trabajo del Contrato)
  - **Cuenta**: El número y nombre de cuenta contable
  - **Asignación**: La etiqueta del método de asignación del año actual (enlaza a la pestaña Asignaciones)
  - **Presupuesto Y**: Importe del presupuesto del año actual (enlaza a la pestaña Presupuesto de este año)
  - **Aterrizaje Y**: Importe del aterrizaje previsto del año actual (enlaza a la pestaña Presupuesto de este año)
  - **Tarea**: El título de la última tarea (enlaza a la pestaña Tareas)

**Columnas adicionales** (ocultas por defecto, habilítelas mediante el selector de columnas):
  - **Presupuesto Y-1 / Aterrizaje Y-1**: Cifras del año anterior
  - **Revisión Y / Seguimiento Y**: Importes de revisión y seguimiento del año actual
  - **Presupuesto Y+1 / Revisión Y+1**: Cifras del año siguiente
  - **Presupuesto Y+2**: Presupuesto a dos años
  - **Habilitado**: Estado de la partida (habilitado o deshabilitado)
  - **Descripción**: Descripción de la partida
  - **Moneda**: Código de moneda ISO
  - **Inicio efectivo / Fin efectivo**: Fechas de inicio y fin
  - **Responsable IT / Responsable de negocio**: Usuarios responsables
  - **Analítica**: Nombre de la categoría analítica
  - **ID de proyecto**: Identificador del proyecto vinculado
  - **Notas**: Notas internas
  - **Creado / Actualizado**: Marcas de tiempo

**Filtrado**:
  - **Búsqueda rápida**: Busca en nombre del producto, proveedor, descripción y otros campos de texto. Filtra la lista en tiempo real mientras escribe
  - **Filtros de columna**: Haga clic en el icono de filtro en cualquier encabezado de columna. **Empresa pagadora**, **Cuenta**, **Asignación**, **Moneda**, **Responsable IT**, **Responsable de negocio** y **Analítica** usan filtros de conjunto de casillas (selección múltiple). Otras columnas usan filtros de texto o numéricos
  - **Alcance de estado**: Utilice el conmutador **Mostrar: Habilitados / Deshabilitados / Todos** encima de la cuadrícula (predeterminado: **Habilitados**)

**Ordenación**:
  - Haga clic en un encabezado de columna para ordenar ascendente/descendente
  - La ordenación predeterminada es por **Presupuesto Y** descendente
  - La lista recuerda su última ordenación, búsqueda y filtros cuando regresa

**Fila de totales**:
  - La fila fijada en la parte inferior muestra totales para todas las columnas presupuestarias
  - Los totales respetan sus filtros y búsqueda actuales

**Enlace directo**:
  - Hacer clic en cualquier celda abre el espacio de trabajo en la pestaña más relevante:
    - **Nombre del producto**, **Proveedor**, **Empresa pagadora**, **Cuenta** y otras columnas generales: Abre la pestaña **Visión general**
    - **Columnas presupuestarias** (Presupuesto Y, Aterrizaje Y, Presupuesto Y-1, etc.): Abre la pestaña **Presupuesto** preconfigurada en ese año
    - **Asignación**: Abre la pestaña **Asignaciones** para el año actual
    - **Tarea**: Abre la pestaña **Tareas**
    - **Contrato**: Abre directamente el espacio de trabajo del Contrato vinculado (no el espacio de trabajo OPEX)

**Acciones**:
  - **Nuevo**: Crear una nueva partida OPEX (requiere `opex:manager`)
  - **Importar CSV**: Carga masiva de partidas desde CSV (requiere `opex:admin`)
  - **Exportar CSV**: Exportar partidas a CSV (requiere `opex:admin`)
  - **Eliminar seleccionadas**: Eliminación masiva de partidas seleccionadas (requiere `opex:admin`; seleccione filas mediante casillas de verificación)

**Navegación Anterior/Siguiente**:
  - Cuando abre una partida, el espacio de trabajo muestra botones **Anterior** y **Siguiente**
  - Estos navegan por la lista en el orden actual, respetando filtros y búsqueda
  - Su contexto de lista (ordenación, filtros, búsqueda) se preserva cuando cierra el espacio de trabajo

**Consejo**: Utilice filtros de columna + búsqueda rápida para construir vistas enfocadas (p. ej., "Todo el gasto en nube superior a 10k"), luego navegue partida por partida con Anterior/Siguiente para revisar presupuestos.

---

## El espacio de trabajo OPEX

Haga clic en cualquier fila de la lista para abrir el espacio de trabajo. Tiene cinco pestañas dispuestas verticalmente a la izquierda, cada una enfocada en un aspecto específico de la partida de gasto.

### Visión general

Esta pestaña muestra toda la información general de la partida de gasto.

**Qué puede editar**:
  - **Nombre del producto** (obligatorio)
  - **Descripción**
  - **Proveedor** (autocompletado desde sus datos maestros de Proveedores; obligatorio)
  - **Moneda** (se establece por defecto a la moneda del espacio de trabajo; muestra solo monedas permitidas)
  - **Empresa pagadora** (autocompletado desde sus Empresas; obligatorio)
  - **Cuenta** (filtrada por el plan de cuentas de la empresa pagadora; obligatorio)
  - **Inicio efectivo** y **Fin efectivo** (campos de fecha)
  - **Responsable IT** y **Responsable de negocio** (autocompletado desde usuarios habilitados)
  - **Categoría analítica** (autocompletado; crea nuevas categorías sobre la marcha)
  - **Notas**

**Estado y ciclo de vida**:
  - Utilice el conmutador **Habilitado** o establezca una **Fecha de desactivación** para controlar cuándo aparece la partida en informes y listas de selección
  - Las partidas deshabilitadas se excluyen de informes para años estrictamente posteriores a la fecha de desactivación
  - Los datos históricos permanecen intactos; seguirá viendo partidas deshabilitadas en informes que cubren años cuando estaban activas

**Guardar y Restablecer**:
  - Los cambios **no** se guardan automáticamente
  - Haga clic en **Guardar** para persistir sus ediciones, o **Restablecer** para descartarlas
  - Si intenta navegar fuera o cambiar de pestaña con cambios sin guardar, se le solicitará que guarde o descarte

**Consejo**: Si ve una advertencia de "Cuenta obsoleta", significa que la cuenta seleccionada no pertenece al plan de cuentas de la empresa pagadora. Elija una cuenta diferente para resolver la advertencia.

---

### Presupuesto

La pestaña Presupuesto es donde introduce datos financieros por año. Soporta múltiples columnas presupuestarias y dos modos de entrada: **Plano** (totales anuales) y **Manual** (desglose mensual).

**Selección de año**:
  - Utilice las pestañas de año en la parte superior para alternar entre Y-2, Y-1, Y (año actual), Y+1 e Y+2
  - Cada año tiene su propia versión, modo e importes
  - Cambiar de año con cambios sin guardar muestra un diálogo de guardar/descartar

**Columnas presupuestarias**:
  - **Presupuesto (planificado)**: Presupuesto anual inicial aprobado a principios de año
  - **Revisión (comprometido)**: Actualización presupuestaria a mitad de año (p. ej., después de una reprevisión)
  - **Seguimiento (real)**: Gasto real esperado (su mejor estimación a medida que avanza el año)
  - **Aterrizaje previsto**: Gasto real final después del cierre de fin de año

**Modo Plano vs Manual**:
  - **Plano**: Introduzca un total por columna; los importes se distribuyen uniformemente en 12 meses para fines de asignación
  - **Manual**: Introduzca importes por mes (Ene-Dic) para cada columna, más una columna de **Previsión** para planificación adicional
  - Alterne entre modos usando los botones de radio en la parte superior de la pestaña

**Comportamiento de congelación**:
  - Si las columnas presupuestarias de un año están congeladas (vía Administración presupuestaria), las entradas correspondientes se vuelven de solo lectura
  - Puede ver datos congelados; los administradores pueden descongelar vía **Gestión presupuestaria > Administración > Congelar/Descongelar**
  - Cada columna puede congelarse independientemente (Presupuesto, Revisión, Seguimiento, Aterrizaje previsto)

**Campo de Notas**:
  - Cada versión presupuestaria anual tiene un campo de **Notas** para comentarios específicos del año (p. ej., "Incluye aumento de precio del 10% en T3")

**Cómo usarlo**:
  1. Seleccione el año que está planificando
  2. Elija modo Plano o Manual
  3. Complete las columnas relevantes (Presupuesto para planificación inicial, Seguimiento para monitorización, Aterrizaje previsto para realizado)
  4. Haga clic en **Guardar** para persistir sus cambios

**Consejo**: Para la mayoría de partidas, el modo Plano es más rápido. Utilice el modo Manual cuando el gasto varíe significativamente por mes (p. ej., licencias estacionales, cuotas de configuración únicas).

---

### Asignaciones

La pestaña Asignaciones distribuye el gasto entre sus empresas y departamentos. Esto alimenta los informes de contracargo y los KPI de coste por usuario.

**Selección de año**:
  - Funciona igual que Presupuesto: utilice las pestañas de año para alternar entre Y-2, Y-1, Y, Y+1, Y+2
  - Cada año puede tener un método de asignación diferente

**Métodos de asignación**:

| Método | Cómo funciona |
|--------|---------------|
| **Plantilla (Predeterminado)** | Divide el gasto proporcionalmente según la plantilla de cada empresa para el año seleccionado. Este es el método predeterminado. No requiere selección manual -- los porcentajes se calculan automáticamente desde las métricas de la empresa. |
| **Usuarios IT** | Divide el gasto proporcionalmente según el conteo de usuarios IT de cada empresa para el año seleccionado. |
| **Facturación** | Divide el gasto proporcionalmente según la facturación (ingresos) de cada empresa para el año seleccionado. |
| **Manual por empresa** | Usted selecciona qué empresas reciben este gasto y elige un factor (Plantilla, Usuarios IT o Facturación) para calcular porcentajes solo entre las empresas seleccionadas. |
| **Manual por departamento** | Usted selecciona pares específicos de empresa/departamento. Los porcentajes se calculan según la plantilla de cada departamento. Útil cuando una partida de gasto beneficia solo a ciertos departamentos (p. ej., un CRM usado por Ventas). |

**Cómo funcionan los porcentajes**:
  - Para **métodos automáticos** (Plantilla, Usuarios IT, Facturación): los porcentajes se calculan desde las métricas más recientes de la empresa en cada carga de página. No los edita directamente
  - Para **métodos manuales**: usted selecciona las empresas o departamentos, y el sistema calcula porcentajes basándose en el factor elegido y las métricas actuales
  - Los porcentajes reflejan datos en vivo. Si actualiza la plantilla de una empresa, las asignaciones se recalculan inmediatamente
  - El indicador de porcentaje total muestra un total acumulado. Para métodos automáticos el resto se auto-distribuye; para métodos manuales la vista previa usa métricas en vivo

**Cómo usarlo**:
  1. Seleccione el año
  2. Elija un método de asignación del desplegable
  3. Si usa Manual por empresa, seleccione un factor de asignación (Plantilla, Usuarios IT o Facturación) y seleccione empresas
  4. Si usa Manual por departamento, seleccione pares empresa/departamento
  5. Haga clic en **Guardar** para persistir el método y la selección

**Problemas comunes**:
  - **Error "Métricas faltantes"**: Una o más empresas tienen plantilla/usuarios IT/facturación cero o faltantes para el año seleccionado. Complete las métricas en **Datos maestros > Empresas** (pestaña Detalles)
  - **"El total no es 100%"**: Generalmente causado por métricas faltantes. Corrija los datos de la empresa y recargue asignaciones

**Consejo**: Utilice Plantilla (Predeterminado) para la mayoría de partidas -- es lo más simple y se actualiza automáticamente. Reserve métodos manuales para gasto que beneficia solo a empresas o departamentos específicos.

---

### Tareas

La pestaña Tareas le ayuda a hacer seguimiento de pendientes y seguimientos relacionados con esta partida OPEX (p. ej., "Renovar licencia antes de T3", "Revisar métricas de uso").

**Lista de tareas**:
  - Muestra todas las tareas vinculadas a esta partida OPEX
  - Columnas: **Título**, **Estado**, **Prioridad**, **Fecha de vencimiento**, **Acciones**
  - Haga clic en el título de una tarea para abrir el espacio de trabajo completo de tareas
  - El filtro predeterminado muestra tareas activas (oculta completadas y canceladas)

**Filtrado**:
  - Haga clic en el icono de filtro para mostrar/ocultar controles de filtro
  - **Filtro de estado**: Todos, Activos (oculta completados/cancelados), Abierto, En progreso, Pendiente, En pruebas, Completado o Cancelado
  - Haga clic en el botón de limpiar para restablecer filtros

**Crear una tarea**:
  - Haga clic en **Añadir tarea** para abrir el espacio de trabajo de creación de tareas
  - La tarea se vincula automáticamente a esta partida OPEX
  - Complete el título, descripción, prioridad, asignado y fecha de vencimiento en el espacio de trabajo de tareas

**Eliminar una tarea**:
  - Haga clic en el icono de eliminar en la columna de Acciones
  - Confirme la eliminación en el diálogo

**Notas**:
  - Las tareas son objetos independientes con sus propios permisos (`tasks:member` para crear/editar)
  - Tener acceso de gestor OPEX no otorga automáticamente derechos de edición de tareas; consulte con su administrador si no puede crear tareas
  - Las tareas también se pueden ver y gestionar desde **Portafolio > Tareas**, que muestra todas las tareas de su organización

**Consejo**: Utilice tareas para capturar elementos de acción durante revisiones de presupuesto o renovaciones de contratos. Establezca fechas de vencimiento para hacer seguimiento de plazos próximos.

---

### Relaciones

La pestaña Relaciones vincula esta partida OPEX a objetos relacionados: Proyectos, Aplicaciones, Contratos, Contactos, Sitios web relevantes y Adjuntos.

**Proyectos**:
  - Utilice el autocompletado para vincular uno o más proyectos de su Portafolio
  - Esto ayuda a agrupar gasto por proyecto en informes y permite la contabilidad de proyectos
  - Elimine proyectos haciendo clic en la X del chip, luego guarde

**Aplicaciones**:
  - Utilice el autocompletado para vincular una o más aplicaciones de su catálogo IT
  - Los nombres de aplicaciones vinculadas aparecen como chips clicables que abren el espacio de trabajo de la Aplicación
  - Esto ayuda a hacer seguimiento de qué partidas OPEX financian qué aplicaciones o servicios

**Contratos**:
  - Utilice el autocompletado para vincular uno o más contratos
  - Cuando están vinculados, el nombre del contrato aparece en la columna **Contrato** de la lista OPEX como referencia rápida
  - Los contratos pueden vincularse a múltiples partidas OPEX (relación de muchos a muchos)
  - Elimine contratos haciendo clic en la X del chip, luego guarde

**Contactos**:
  - Añada contactos del proveedor relacionados con esta partida de gasto
  - Cada contacto tiene un **Rol** (Comercial, Técnico, Soporte u Otro)
  - Los contactos pueden provenir de la lista de contactos del proveedor o añadirse manualmente
  - Útil para hacer seguimiento de a quién contactar para renovaciones, problemas de soporte o negociaciones

**Sitios web relevantes**:
  - Añada URLs relacionadas con esta partida de gasto (p. ej., portales de proveedores, documentación, consolas de administración, wikis internas)
  - Cada enlace tiene un campo de **Descripción** opcional para contexto
  - Haga clic en **Añadir URL** para añadir más enlaces

**Adjuntos**:
  - Suba archivos relacionados con esta partida de gasto (p. ej., contratos, facturas, presupuestos, SOW, especificaciones técnicas)
  - Arrastre y suelte archivos en el área de adjuntos, o haga clic en **Seleccionar archivos** para navegar
  - Todos los archivos se almacenan de forma segura y pueden descargarse haciendo clic en el nombre del archivo
  - Elimine adjuntos haciendo clic en la X del chip del archivo (requiere `opex:manager`)
  - Los adjuntos se guardan inmediatamente al subirlos (no es necesario hacer clic en **Guardar**)

**Comportamiento de guardado**:
  - **Proyectos**, **Aplicaciones**, **Contratos**, **Sitios web relevantes**: Se guardan cuando hace clic en **Guardar** en la parte superior del espacio de trabajo
  - **Contactos**: Gestionados en línea (las acciones de añadir/eliminar se guardan inmediatamente)
  - **Adjuntos**: Se guardan inmediatamente al subirlos

**Consejo**: Vincule contratos para hacer seguimiento de renovaciones en múltiples partidas OPEX. Añada URLs de portales de proveedores para acceso rápido. Suba presupuestos y facturas como adjuntos para centralizar toda la documentación relacionada con el gasto.

---

## Importación/exportación CSV

Puede cargar masivamente partidas OPEX vía CSV para acelerar la configuración inicial o sincronizar con sistemas externos.

**Exportar**:
  1. Haga clic en **Exportar CSV** en la lista OPEX
  2. Elija:
     - **Plantilla**: Solo encabezados (úselo para crear un CSV en blanco para rellenar)
     - **Datos**: Todas las partidas OPEX actuales con presupuestos para Y-1, Y e Y+1

**Estructura del CSV**:
  - Delimitador: punto y coma `;` (no coma)
  - Codificación: UTF-8 (guarde como "CSV UTF-8" en Excel)
  - Encabezados: `product_name;description;supplier_name;account_number;currency;effective_start;effective_end;disabled_at;status;owner_it_email;owner_business_email;analytics_category;notes;y_minus1_budget;y_minus1_landing;y_budget;y_follow_up;y_landing;y_revision;y_plus1_budget`

**Importar**:
  1. Haga clic en **Importar CSV** en la lista OPEX
  2. Suba su archivo CSV (arrastrar y soltar o selector de archivos)
  3. Haga clic en **Verificación previa** para validar:
     - Los encabezados coinciden exactamente
     - Los proveedores, cuentas y usuarios existen en su espacio de trabajo
     - Los campos obligatorios (product_name, currency, effective_start, paying_company) están presentes
     - No hay combinaciones duplicadas de product_name + supplier
  4. Revise el informe de verificación previa (muestra conteos y hasta 5 errores de ejemplo)
  5. Si es correcto, haga clic en **Cargar** para importar

**Notas importantes**:
  - **Clave única**: Las partidas OPEX se identifican por `(product_name, supplier_name)`. Si una combinación ya existe, se **omite** (sin actualizaciones)
  - **Solo inserción**: El importador solo crea nuevas partidas; no actualizará las existentes. Utilice la interfaz para editar partidas existentes
  - **Referencias**: `supplier_name` debe coincidir con un Proveedor por nombre (sin distinguir mayúsculas). `account_number` debe coincidir con una Cuenta. `owner_it_email` y `owner_business_email` deben coincidir con usuarios habilitados por correo electrónico
  - **Categoría analítica**: Si la categoría no existe, se crea automáticamente durante la importación
  - **Presupuestos**: Las columnas presupuestarias rellenan las versiones Y-1, Y e Y+1. Los importes se distribuyen uniformemente en 12 meses (modo plano)

**Errores comunes**:
  - **"Proveedor no encontrado"**: Cree el proveedor en **Datos maestros > Proveedores** primero, luego reimporte
  - **"Cuenta no encontrada"**: Añada la cuenta en **Datos maestros > Planes de cuentas**, luego reimporte
  - **"Moneda inválida"**: Utilice códigos ISO de 3 letras (USD, EUR, GBP) que estén permitidos en la configuración de monedas de su espacio de trabajo
  - **"Desajuste de encabezados"**: Descargue una plantilla nueva; los encabezados deben coincidir exactamente (incluido el orden)

**Consejo**: Comience con la exportación de plantilla, rellene algunas filas y ejecute una verificación previa para detectar problemas temprano. Corrija errores en el CSV y vuelva a subirlo hasta que la verificación previa pase, luego cargue.

---

## Estado y ciclo de vida

Cada partida OPEX tiene un **estado** (Habilitado o Deshabilitado) y una **Fecha de desactivación** opcional que controla cuándo aparece en informes y listas de selección.

**Cómo funciona**:
  - **Habilitado**: La partida está activa y aparece en todas partes (listas, informes, asignaciones)
  - **Fecha de desactivación**: Cuando se establece, la partida se desactiva al final de ese día
  - Después de la fecha de desactivación:
    - La partida ya no aparece en listas de selección para nuevos contratos o asignaciones
    - Se excluye de informes para años estrictamente posteriores a la fecha de desactivación
    - Los datos históricos permanecen intactos; la partida sigue apareciendo en informes que cubren años cuando estaba activa

**Establecer estado**:
  - En la pestaña **Visión general**, utilice el conmutador **Habilitado** o establezca una **Fecha de desactivación**
  - Puede programar una fecha de desactivación futura (útil para partidas con fin de contrato planificado)

**Ver partidas deshabilitadas**:
  - Por defecto, la lista OPEX muestra solo partidas **Habilitadas**
  - Utilice el conmutador **Mostrar: Deshabilitados** o **Mostrar: Todos** para ver partidas deshabilitadas

**Cuándo desactivar vs eliminar**:
  - **Prefiera desactivar**: Mantiene el historial intacto, asegura que los informes permanezcan consistentes y soporta registros de auditoría
  - **Elimine solo si**: La partida se creó por error y no tiene presupuestos, asignaciones ni tareas
  - La eliminación está protegida: no puede eliminar una partida que está referenciada por contratos, tareas o tiene datos presupuestarios

**Consejo**: Utilice la Fecha de desactivación para retirar partidas OPEX cuando los contratos terminen o los servicios se discontinúen. No elimine a menos que sea un verdadero error.

---

## Consejos y mejores prácticas

1. **Empiece simple**: Cree partidas con solo lo esencial (nombre del producto, proveedor, empresa pagadora, cuenta), luego añada presupuestos y asignaciones a medida que planifica.

2. **Use el método de asignación predeterminado**: Para la mayoría de partidas, Plantilla (Predeterminado) es suficiente. Reserve métodos manuales para gasto que beneficia solo a empresas o departamentos específicos.

3. **Vincule contratos**: Si gestiona gasto mediante contratos, vincúlelos en la pestaña Relaciones. Facilita el seguimiento de renovaciones.

4. **Vincule aplicaciones**: Asocie partidas OPEX con las aplicaciones o servicios que financian. Esto proporciona un mapeo claro de coste a aplicación.

5. **Suba documentación**: Utilice la funcionalidad de adjuntos para almacenar contratos, presupuestos, facturas y SOW de proveedores.

6. **Añada enlaces a portales de proveedores**: Utilice Sitios web relevantes para vincular a consolas de administración, portales de soporte y documentación de proveedores para acceso rápido.

7. **Registre contactos**: Añada contactos de proveedor con roles (Comercial, Técnico, Soporte) para que su equipo sepa a quién llamar para cada partida de gasto.

8. **Aproveche las categorías analíticas**: Etiquete partidas con categorías (Infraestructura, Apps de negocio, Seguridad) para agrupar gasto en informes.

9. **Mantenga actualizadas las métricas de empresa**: Las asignaciones dependen de la plantilla, usuarios IT y facturación de la empresa. Las métricas desactualizadas causan errores de asignación.

10. **Use CSV para configuración masiva**: Si está migrando desde otro sistema o tiene cientos de partidas, comience con importación CSV. Exporte una plantilla, rellénela y haga una verificación previa antes de cargar.

11. **Desactive, no elimine**: Preserve el historial desactivando partidas cuando ya no estén activas. Elimine solo si es un error.

12. **Revise la fila de totales**: Antes de finalizar presupuestos, verifique la fila de totales fijada en la lista para asegurar que su gasto suma como se espera.

13. **Use enlace directo**: Haga clic directamente en una columna de presupuesto en la lista para ir a la pestaña Presupuesto de ese año. Haga clic en la columna Tarea para ir a Tareas. Esto ahorra tiempo de navegación.

14. **Congele presupuestos después del cierre de año**: Utilice Administración presupuestaria para congelar los presupuestos del año anterior una vez que el realizado esté finalizado, previniendo ediciones accidentales.

---

## Permisos

El acceso a OPEX se controla por tres niveles:

- `opex:reader` -- Ver la lista OPEX, abrir partidas, ver presupuestos y asignaciones (solo lectura), descargar adjuntos
- `opex:manager` -- Crear y editar partidas OPEX, actualizar presupuestos y asignaciones, subir y eliminar adjuntos, gestionar relaciones y enlaces
- `opex:admin` -- Todos los derechos de gestor más importación/exportación CSV, operaciones presupuestarias (congelar, copiar, restablecer) y eliminación masiva

Adicionalmente:
- Las tareas tienen permisos separados (`tasks:member` para crear/editar tareas en partidas OPEX)
- Los usuarios con `tasks:reader` pueden ver tareas pero no crear ni editar

Si no puede realizar una acción (p. ej., falta el botón **Importar CSV**, no puede subir adjuntos), consulte con su administrador del espacio de trabajo para revisar sus permisos de rol.

---

## ¿Necesita ayuda?

- **Problemas con CSV**: Descargue una plantilla nueva, asegure codificación UTF-8 y ejecute la verificación previa para ver errores detallados
- **Errores de asignación**: Verifique que todas las empresas tengan las métricas requeridas (plantilla, usuarios IT, facturación) para el año seleccionado
- **Advertencia de cuenta obsoleta**: La cuenta no pertenece al plan de cuentas de la empresa pagadora; seleccione una cuenta diferente
- **Faltan botones o pestañas**: Su rol puede no tener el nivel de permiso requerido (gestor o administrador). Contacte a su administrador del espacio de trabajo

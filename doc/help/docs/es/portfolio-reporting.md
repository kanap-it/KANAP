# Informes del portafolio

Los Informes del portafolio proporcionan análisis centrados en la carga de trabajo, capacidad y señales de entrega.

## Primeros pasos

Navegue a **Portafolio > Informes** para abrir el centro de informes.

**Permisos**:
- Necesita al menos `portfolio_reports:reader` para acceder a los informes del portafolio.

Si no ve Informes en el menú, solicite a su administrador que le otorgue acceso.

---

## Página de informes

La página de Informes del portafolio lista los informes disponibles como tarjetas. Haga clic en una tarjeta para abrir el informe.

Actualmente disponibles:
- **Informe de cambios de estado**
- **Mapa de calor de capacidad**
- **Informe semanal**

---

## Informe de cambios de estado

Use este informe para rastrear elementos cuyo estado cambió durante un período seleccionado.

### Qué muestra
- **Una fila por elemento** (tarea independiente, solicitud o proyecto).
- **Solo el último cambio de estado en el período** para cada elemento.
- **Estado final alcanzado en el período seleccionado** (si ocurrieron múltiples cambios en el rango).
- **Última modificación** fecha del evento de cambio de estado retenido.

### Filtros
- **Fecha de inicio** y **Fecha de fin** (período obligatorio)
- **Estado** (selección múltiple)
- **Tipo de elemento** (selección múltiple: Tareas, Solicitudes, Proyectos)
- **Origen** (selección múltiple)
- **Categoría** (selección múltiple)
- **Flujo** (selección múltiple; disponible cuando al menos una categoría está seleccionada)

### Reglas de inclusión
- El elemento se incluye solo si su estado cambió durante el período seleccionado.
- Para tareas, solo se incluyen **tareas independientes** (las tareas vinculadas a proyectos se excluyen).
- El filtrado de estado se aplica al estado alcanzado después del cambio.

### Columnas de la tabla
- **Nombre** (cliclable; abre el elemento)
- **Tipo de elemento**
- **Prioridad**
- **Estado**
- **Origen**
- **Categoría**
- **Flujo**
- **Empresa**
- **Última modificación**

El orden predeterminado es por **Prioridad** (mayor primero). Puede ordenar por cualquier columna.

### Exportaciones
- Exportación **CSV**
- Exportación **XLSX** con nombres de elementos clicables

---

## Informe de mapa de calor de capacidad

Use este informe para comprender la carga de trabajo actual, la presión de capacidad y el trabajo sin asignar.

### Qué muestra
- **Esfuerzo restante** (IT + Negocio), ajustado por progreso de ejecución.
- **Capacidad** por colaborador (histórica o teórica).
- **Meses de trabajo** (días restantes / días de capacidad por mes).
- **Trabajo sin asignar** cuando el esfuerzo no está completamente asignado.

### Filtros
- **Equipos** (selección múltiple, incluye **Sin equipo**)
- **Estado** (predeterminado: Lista de espera, Planificado, En progreso, En pruebas, En espera)
- **Modo de capacidad**: Histórica (predeterminado) o Teórica
- **Agrupar por**: Colaboradores (predeterminado) o Equipos

### Escala de color
Las celdas en la columna **Meses de trabajo** están codificadas por color:

| Rango | Color |
|-------|-------|
| <= 1 mes | Verde |
| 1-3 meses | Amarillo |
| 3-6 meses | Naranja |
| 6-12 meses | Rojo |
| > 12 meses | Violeta |
| Sin datos | Gris (N/D) |

### Tarjetas de resumen
La fila de resumen incluye:
- **Total de colaboradores**
- **Media de meses de trabajo** (solo colaboradores con capacidad)
- **Trabajo sin asignar** (total de días sin asignar y recuento de proyectos)

Haga clic en **Trabajo sin asignar** para expandir los detalles.

### Desglose detallado
Haga clic en una fila de colaborador para abrir un desglose por proyecto:
- Cada fila muestra esfuerzo restante, % de asignación y sus días.
- Los nombres de proyecto son clicables y abren la pestaña **Progreso** del proyecto.

### Exportaciones
- **CSV**: Exportar la tabla del mapa de calor
- **PNG**: Captura del informe
- **Imprimir**: Imprimir o guardar como PDF

---

## Informe semanal

Use este informe para producir un resumen semanal para interesados que cubre actualizaciones de proyectos, tareas cerradas y cambios de solicitudes durante un período seleccionado.

### Qué muestra

El informe se divide en tres tablas:

- **Actualizaciones de proyectos** — proyectos cuyo estado cambió durante el período.
- **Tareas cerradas** — tareas independientes que se cerraron durante el período.
- **Actualizaciones de solicitudes** — solicitudes cuyo estado cambió durante el período.

Una línea de resumen sobre las tablas muestra el recuento de cada sección.

### Filtros

- **Fecha de inicio** y **Fecha de fin** (predeterminado: últimos 7 días)
- **Origen** (selección múltiple)
- **Categoría** (selección múltiple)
- **Flujo** (selección múltiple; limitado a categorías seleccionadas)
- **Tipos de tarea** (selección múltiple; se aplica a la tabla de Tareas cerradas)

### Columnas de la tabla

**Actualizaciones de proyectos**: Nombre del proyecto (cliclable), Prioridad, Origen, Categoría, Flujo, Progreso, Estado

**Tareas cerradas**: Nombre de la tarea (cliclable), Tipo de tarea, Prioridad, Origen, Categoría, Flujo, Estado

**Actualizaciones de solicitudes**: Nombre de la solicitud (cliclable), Origen, Categoría, Flujo, Estado

El orden predeterminado es por **Prioridad** (mayor primero). Al hacer clic en un nombre se abre el elemento.

### Exportaciones

- Exportación **CSV**
- Exportación **XLSX**

---

## Consejos
- **Mantenga los perfiles de colaboradores actualizados**: La capacidad se basa en la disponibilidad de colaboradores y estadísticas históricas de tiempo.
- **Use filtros de equipo**: Limite el alcance del informe a un departamento o función.
- **Revise el trabajo sin asignar**: Ayuda a detectar proyectos con asignaciones faltantes o responsables ausentes.
- **Informe semanal para reuniones de seguimiento**: Exporte el Informe semanal como XLSX y compártalo con los interesados para reuniones de estado.

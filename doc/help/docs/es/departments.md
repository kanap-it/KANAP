# Departamentos

Los Departamentos representan unidades organizativas dentro de sus empresas. Utilícelos para hacer seguimiento de la plantilla por año, asignar costes y definir audiencias para aplicaciones. Cada departamento pertenece a una empresa y lleva datos de plantilla año a año que alimentan los cálculos de contracargo y asignación.

## Primeros pasos

Navegue a **Datos maestros > Departamentos** para ver su lista de departamentos. Haga clic en **Nuevo** para crear su primera entrada.

**Campos obligatorios**:
- **Nombre**: El nombre del departamento
- **Empresa**: A qué empresa pertenece este departamento

**Opcionales pero útiles**:
- **Descripción**: Descripción de texto libre del propósito o alcance del departamento
- **Plantilla**: Número de empleados, seguido por año (se configura en la pestaña Detalles después de la creación)

**Consejo**: Importe departamentos desde su sistema de RRHH para mantener su estructura organizativa alineada.

---

## Trabajar con la lista

La cuadrícula de Departamentos proporciona una visión general de todos los departamentos con su plantilla para un año determinado.

**Columnas predeterminadas**:
- **Nombre**: Nombre del departamento -- haga clic para abrir la pestaña Visión general del espacio de trabajo
- **Empresa**: Empresa matriz -- haga clic para abrir la pestaña Visión general del espacio de trabajo
- **Plantilla (Año)**: Conteo de empleados para el año seleccionado -- haga clic para ir directamente a la pestaña Detalles para editar

**Columnas adicionales** (mediante el selector de columnas):
- **Estado**: Habilitado o Deshabilitado
- **Creado**: Cuándo se creó el departamento

**Selector de año**: Utilice el campo **Año** en la barra de herramientas para cambiar el año de plantilla que se muestra. La cuadrícula se actualiza automáticamente al cambiar el año.

**Alcance de estado**: Utilice el conmutador **Habilitados / Deshabilitados / Todos** para filtrar por estado del departamento. La lista muestra por defecto solo departamentos habilitados.

**Búsqueda rápida**: La barra de búsqueda filtra por nombres de departamento.

**Enlace directo**: Cada celda de la cuadrícula es un enlace clicable. Nombre y Empresa abren la pestaña Visión general; Plantilla abre la pestaña Detalles. Cuando navega a un espacio de trabajo y luego vuelve, su orden de clasificación, consulta de búsqueda y filtros se preservan.

**Acciones**:
- **Nuevo**: Crear un nuevo departamento (requiere `departments:manager`)
- **Importar CSV**: Importación masiva de departamentos (requiere `departments:admin`)
- **Exportar CSV**: Exportar a CSV (requiere `departments:admin`)
- **Eliminar seleccionados**: Eliminar departamentos seleccionados (requiere `departments:admin`)

---

## El espacio de trabajo de Departamentos

Haga clic en cualquier fila para abrir el espacio de trabajo. Tiene dos pestañas dispuestas verticalmente a la izquierda: **Visión general** y **Detalles**.

La barra de herramientas del espacio de trabajo incluye botones **Anterior** / **Siguiente** para moverse entre departamentos sin volver a la lista, además de botones **Restablecer** y **Guardar**. Si tiene cambios sin guardar al navegar fuera, se le solicitará que guarde o descarte.

### Visión general

La pestaña Visión general captura la identidad y estado del departamento.

**Qué puede editar**:
- **Nombre**: Nombre del departamento (obligatorio)
- **Empresa**: Empresa matriz -- vinculada a los datos maestros de Empresas (obligatorio). Las empresas que ya tienen un departamento con el mismo nombre se excluyen automáticamente del desplegable para prevenir duplicados.
- **Descripción**: Descripción de texto libre
- **Estado**: Habilitado o Deshabilitado, con una fecha de desactivación programable opcional

**Consejo**: Al crear un nuevo departamento, la pestaña Detalles está disponible solo después de guardar el registro inicial.

---

### Detalles

La pestaña Detalles gestiona las métricas de plantilla año a año.

**Selector de año**: Elija qué año ver o editar usando las pestañas de año en la parte superior del panel. Hay cinco años disponibles: dos años antes del año actual hasta dos años después.

**Métricas por año**:
- **Plantilla**: Número total de empleados en este departamento para el año seleccionado

**Cómo funciona**:
- La plantilla alimenta los cálculos de audiencia para aplicaciones
- Los valores se guardan por año -- cambiar de año carga los datos de ese año de forma independiente
- Si las métricas del año seleccionado han sido **congeladas** (por un administrador), el campo está bloqueado y un aviso explica cómo descongelar

**Consejo**: Actualice la plantilla anualmente durante su ciclo de planificación presupuestaria. Utilice las pestañas de año para revisar o prerellenar años futuros.

---

## Importación/exportación CSV

Mantenga los departamentos sincronizados con su sistema de RRHH usando CSV.

**Exportar**:
- Descarga todos los departamentos con métricas del año actual

**Importar**:
- Utilice **Verificación previa** para validar antes de aplicar
- Coincidencia por nombre de departamento + nombre de empresa
- Puede crear nuevos departamentos o actualizar los existentes

**Campos obligatorios**: Nombre, Empresa

**Campos opcionales**: Plantilla, Estado

**Notas**:
- Utilice codificación **UTF-8** y **puntos y coma** como separadores
- Los valores de plantilla son específicos del año -- los valores importados se aplican al año actual

---

## Consejos

- **Refleje su estructura organizativa**: Replique la jerarquía de departamentos de su sistema de RRHH para mantener la consistencia.
- **Actualice la plantilla anualmente**: Establezca un recordatorio para actualizar las métricas de departamentos durante la planificación presupuestaria.
- **Use para asignaciones**: La plantilla de departamentos impulsa los cálculos de asignación de costes -- manténgala precisa.
- **Desactive, no elimine**: Cuando los departamentos se reorganizan, desactive los antiguos en lugar de eliminarlos para preservar los datos históricos.
- **Aproveche los enlaces directos**: Haga clic en el número de plantilla directamente desde la lista para ir a la pestaña Detalles y editar métricas sin un clic adicional.

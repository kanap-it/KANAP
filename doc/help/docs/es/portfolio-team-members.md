# Colaboradores

Colaboradores le permite definir competencias, asignaciones de equipo, disponibilidad para proyectos y valores predeterminados de clasificación para las personas que trabajan en proyectos del portafolio. Esta información ayuda con la planificación de recursos y asegura que tenga la experiencia adecuada para el trabajo futuro.

## Primeros pasos

Navegue a **Portafolio > Colaboradores** para ver los colaboradores configurados agrupados por equipo. Haga clic en **Añadir colaborador** para añadir a alguien de su lista de usuarios.

**Para añadir un colaborador**:
1. Haga clic en **Añadir colaborador**
2. Busque y seleccione un usuario del desplegable
3. Haga clic en **Añadir** para crear su perfil
4. Configure su equipo, disponibilidad, competencias y valores predeterminados en el espacio de trabajo

**Consejo**: Los colaboradores son diferentes de las cuentas de usuario. Añadir a alguien como colaborador no cambia su acceso de inicio de sesión -- solo le permite rastrear su pertenencia a equipo, competencias, disponibilidad y valores predeterminados de clasificación para la planificación de proyectos.

---

## Dónde encontrarlo

- Espacio de trabajo: **Portafolio**
- Ruta: **Portafolio > Colaboradores**
- Ruta de autoservicio: **Configuración > Perfil > Configuración de colaborador** (abre su propio perfil de colaborador)
- Permisos:
  - Ver: `portfolio_settings:reader`
  - Añadir o editar colaboradores: `portfolio_settings:member`
  - Eliminar colaboradores: `portfolio_settings:admin`
  - Editar su propio perfil: cualquier permiso de lectura a nivel de portafolio (p. ej., `tasks:reader`, `portfolio_projects:reader`, `portfolio_settings:reader`)

Si no ve Colaboradores en el menú, solicite a su administrador que le otorgue los permisos apropiados.

---

## Trabajar con la lista

Los colaboradores se muestran como tarjetas agrupadas por equipo.

**Cada tarjeta de colaborador muestra**:
- **Nombre** (o correo si no hay nombre establecido)
- **Número de competencias**: Cantidad de competencias configuradas (p. ej., "3 competencias")
- **Disponibilidad**: Días por mes disponibles para proyectos (p. ej., "5d/mes")
- **Esfuerzo medio en proyectos**: Tiempo medio mensual en proyectos de las entradas registradas en los últimos 6 meses, cuando hay datos disponibles

**Filtrado**:
- Use el desplegable **Filtrar por equipo** para mostrar solo colaboradores de un equipo específico
- Seleccione **Sin asignar** para ver colaboradores que no han sido asignados a un equipo todavía
- Seleccione **Todos los equipos** para ver a todos

**Grupos de equipo**:
- Cada equipo se muestra como una tarjeta plegable con un indicador de número de miembros
- Haga clic en el encabezado del equipo para expandir o contraer sus miembros
- Los equipos se ordenan alfabéticamente; **Sin asignar** siempre aparece último

Haga clic en cualquier tarjeta de colaborador para abrir su espacio de trabajo.

---

## El espacio de trabajo del colaborador

Haga clic en una tarjeta de colaborador para abrir su espacio de trabajo. Tiene cuatro pestañas: **General**, **Competencias**, **Tiempo registrado** y **Predeterminados**.

### General

Configure la asignación de equipo, disponibilidad, vea estadísticas de tiempo y añada notas.

**Equipo**
Use el desplegable para asignar este colaborador a un equipo. Los equipos son grupos organizacionales configurados en Configuración del portafolio. Esta asignación determina cómo se agrupan los colaboradores en la página de Colaboradores. Este campo solo es visible al editar el perfil de otro colaborador (no el suyo propio).

**Disponibilidad para proyectos (días por mes)**
Use el deslizador para establecer cuántos días por mes esta persona puede trabajar en proyectos del portafolio. El rango es 0 -- 20 días, con incrementos de 0.5 días. El valor predeterminado es 5 días.

**Estadísticas de tiempo**
Resumen de solo lectura del tiempo registrado para este colaborador. Requiere `portfolio_settings:reader` para ver.

- **Esfuerzo medio mensual en proyectos (últimos 6 meses)**: Mostrado en días-persona (horas / 8)
- **Esfuerzo mensual (12 meses)**: Gráfico de líneas mostrando **Total**, **Proyecto** y **Otros** tiempos
  - **Proyecto** = tiempo de gastos generales del proyecto + tiempo registrado en tareas de proyecto
  - **Otros** = tiempo registrado en tareas fuera de proyecto
  - Los meses sin datos se muestran como vacíos en el gráfico

**Notas**
Campo de texto libre para cualquier información adicional sobre este colaborador -- certificaciones, preferencias, restricciones u otros detalles relevantes.

---

### Competencias

Rastree lo que este colaborador sabe y su nivel de dominio.

**Añadir competencias**:
1. Use el desplegable **Añadir competencia** para buscar una competencia
2. Las competencias están agrupadas por categoría
3. Seleccione una competencia para añadirla al perfil del colaborador
4. La competencia aparece con un nivel de dominio predeterminado de 2 ("Puede ejecutar con apoyo")

**Niveles de dominio**:
Cada competencia tiene una calificación de dominio de 0 a 4:

| Nivel | Etiqueta | Descripción |
|-------|----------|-------------|
| 0 | Sin conocimiento | No está familiarizado con esta competencia |
| 1 | Básico / Teórico | Entiende conceptos pero no los ha aplicado |
| 2 | Puede ejecutar con apoyo | Puede hacer el trabajo con orientación |
| 3 | Autónomo | Puede trabajar de forma independiente |
| 4 | Experto | Expertise profundo, puede formar a otros |

Use el deslizador junto a cada competencia para ajustar el nivel de dominio.

**Eliminar competencias**:
Haga clic en el icono de eliminar junto a cualquier competencia para quitarla del perfil del colaborador.

**Categorías de competencias**:
Las competencias están organizadas en categorías plegables. Haga clic en un encabezado de categoría para expandirlo o contraerlo. Las categorías que contienen competencias seleccionadas se auto-expanden al abrir la pestaña.

---

### Tiempo registrado

Vea y gestione todas las entradas de tiempo de este colaborador en un solo lugar. Esta pestaña solo es visible si tiene `portfolio_settings:reader` o superior.

La tabla consolida el tiempo registrado tanto de entradas de gastos generales del proyecto como de entradas de tiempo de tareas, dándole una imagen completa de cómo el colaborador invierte su tiempo.

**Columnas**:
- **Fecha**: Cuándo se registró el tiempo
- **Fuente**: Dónde se registró el tiempo -- ya sea un nombre de tarea o nombre de proyecto
- **Categoría**: Si la entrada se clasifica como **IT** o **Negocio**, mostrada como etiqueta con color
- **Tiempo**: Duración en horas o días (p. ej., "4h", "1d 2h")
- **Notas**: Cualquier nota adjunta a la entrada

**Editar entradas**:
Haga clic en el **icono de editar** junto a una entrada de tiempo para abrir el diálogo de edición. El diálogo depende del tipo de entrada:
- Las **entradas de tarea** abren el diálogo de registro de tiempo de tarea, donde puede ajustar las horas, fecha, categoría y notas
- Las **entradas de proyecto** abren el diálogo de registro de tiempo de proyecto, donde puede ajustar las horas, categoría, usuario y notas

**Eliminar entradas**:
Haga clic en el **icono de eliminar** junto a una entrada de tiempo para quitarla. Se le pedirá confirmación antes de eliminar la entrada. Eliminar una entrada también actualiza las estadísticas de tiempo del colaborador en la pestaña **General**.

**Permisos para acciones de entradas de tiempo**:
- Para ver la columna de **Acciones**, necesita al menos `tasks:member` o `portfolio_projects:contributor`
- Los usuarios no administradores solo pueden editar o eliminar entradas que crearon o a las que están asignados
- Los usuarios con `tasks:admin` pueden editar o eliminar cualquier entrada de tarea independiente
- Los usuarios con `portfolio_projects:admin` pueden editar o eliminar cualquier entrada de tarea de proyecto o entrada de gastos generales del proyecto

---

### Predeterminados

Establezca valores predeterminados de clasificación que se rellenan automáticamente en nuevas tareas, solicitudes y proyectos cuando los campos de clasificación están aún vacíos. Esto ahorra tiempo para colaboradores que trabajan consistentemente en la misma área.

**Qué puede establecer**:
- **Origen**: La clasificación de origen predeterminada
- **Categoría**: La clasificación de categoría predeterminada
- **Flujo**: La clasificación de flujo predeterminada (solo disponible una vez seleccionada una **Categoría**; filtrada a flujos que pertenecen a esa categoría)
- **Empresa**: La empresa predeterminada

Cuando un colaborador crea una nueva tarea, solicitud o proyecto, estos valores predeterminados se usan para rellenar automáticamente los campos de clasificación. Cambiar la **Categoría** borra el **Flujo** si el flujo actual no pertenece a la categoría recién seleccionada.

**Consejo**: También puede acceder a sus propios predeterminados desde **Configuración > Perfil**, que enlaza directamente a la pestaña **Predeterminados** de su perfil de colaborador.

---

## Acciones

Desde la barra de herramientas del encabezado del espacio de trabajo:
- **Guardar**: Guardar cambios en equipo, disponibilidad, notas, competencias o predeterminados
- **Eliminar**: Eliminar esta configuración de colaborador (no afecta la cuenta de usuario). Solo disponible al editar el perfil de otro colaborador con `portfolio_settings:admin`.
- **Flecha atrás**: Volver a la lista de colaboradores, o a **Configuración** si abrió su propio perfil

---

## Su propio perfil de colaborador

Todo usuario con al menos un permiso de lectura a nivel de portafolio puede acceder a su propio perfil de colaborador en **Portafolio > Colaboradores > yo** o desde **Configuración > Perfil > Configuración de colaborador**.

Al editar su propio perfil:
- Puede actualizar su **disponibilidad**, **competencias**, **notas** y **valores predeterminados de clasificación**
- No puede cambiar su propia **asignación de equipo** (solo un miembro de configuración del portafolio puede hacerlo)
- No puede eliminar su propio registro de colaborador

Si no tiene un registro de colaborador todavía, abrir la página de autoservicio crea uno automáticamente.

---

## Equipos

Los colaboradores pueden asignarse a equipos organizacionales para una mejor organización. Los equipos se configuran en **Portafolio > Configuración > Equipos**.

**Equipos predeterminados** (se pueden personalizar):
- Infraestructura
- Aplicaciones de negocio
- Aplicaciones de ingeniería
- Mesa de servicio
- Datos maestros
- Ciberseguridad

**Gestión de equipos**:
- Vaya a **Portafolio > Configuración** y haga clic en la pestaña **Equipos**
- Añadir, editar o deshabilitar equipos
- Use **Establecer valores predeterminados** para llenar con equipos estándar
- Los equipos con miembros asignados no pueden eliminarse

---

## Consejos

- **Asigne colaboradores a equipos**: Esto ayuda a organizar la página de Colaboradores y facilita encontrar personas específicas.
- **Establezca una disponibilidad realista**: Tenga en cuenta reuniones, trabajo operativo y vacaciones al establecer los días por mes. La mayoría de las personas tienen menos tiempo de proyecto del que esperaría.
- **Use el dominio con honestidad**: Un equipo lleno de "expertos" no es útil para la planificación. Sea realista sobre los niveles de competencia para tomar mejores decisiones de recursos.
- **Mantenga las competencias actualizadas**: Revise las competencias de los colaboradores periódicamente, especialmente después de formación o nueva experiencia en proyectos.
- **Configure sus valores predeterminados de clasificación temprano**: Si siempre trabaja en la misma categoría y flujo, configurar los predeterminados le ahorra seleccionarlos cada vez que crea una tarea o solicitud.

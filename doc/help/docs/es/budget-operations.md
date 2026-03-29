# Administración presupuestaria

La Administración presupuestaria le ofrece un conjunto de herramientas para gestionar y transformar datos presupuestarios entre años y columnas. Estas son las operaciones a las que recurre durante los ciclos de planificación presupuestaria -- preparar las cifras del próximo año, bloquear presupuestos aprobados y gestionar las transiciones entre años.

## Dónde encontrarla

- Ruta: **Gestión presupuestaria > Administración**
- Permisos: La mayoría de operaciones requieren `budget_ops:admin`

La página principal muestra cuatro tarjetas, cada una enlazando a una herramienta dedicada:

| Herramienta | Propósito |
|-------------|-----------|
| **Congelar / Descongelar datos** | Bloquear columnas presupuestarias para prevenir cambios |
| **Copiar columnas presupuestarias** | Copiar datos entre años y columnas con ajustes |
| **Copiar asignaciones** | Copiar métodos de asignación de un año a otro |
| **Restablecer columna presupuestaria** | Borrar todos los datos de una columna específica |

---

## Congelar / Descongelar datos

Bloquee columnas presupuestarias para que no puedan editarse, importarse ni modificarse de ninguna manera. La congelación protege las cifras aprobadas de cambios accidentales.

### Cuándo usarla

- Después de que el presupuesto anual sea aprobado
- Al cerrar un período fiscal
- Para proteger el realizado de modificaciones

### Cómo funciona

1. **Seleccione un año** del desplegable (rango: año actual menos uno hasta año actual más cuatro)
2. **Seleccione alcances**: marque **OPEX**, **CAPEX** o ambos
3. **Seleccione columnas** para cada alcance: Presupuesto, Revisión, Realizado, Aterrizaje previsto (las cuatro están seleccionadas por defecto)
4. Haga clic en **Congelar datos** para bloquear, o **Descongelar datos** para desbloquear

### Qué hace la congelación

- Previene ediciones en columnas congeladas en los espacios de trabajo OPEX y CAPEX
- Bloquea importaciones CSV a columnas congeladas
- Bloquea operaciones de copia y restablecimiento dirigidas a columnas congeladas
- **No** afecta el acceso de lectura -- los datos siguen siendo visibles

### Estado actual

Debajo de los controles, dos tarjetas muestran el estado de congelación en tiempo real para cada columna en OPEX y CAPEX. Cada columna muestra **Congelado** (en rojo) o **Editable**.

### Permisos

Sin `budget_ops:admin` puede ver el estado de congelación, pero los controles están deshabilitados. Un banner informativo explica qué se necesita.

---

## Copiar columnas presupuestarias

Copie datos presupuestarios de un año y columna a otro, con un ajuste porcentual opcional. Esta es la herramienta principal para inicializar el presupuesto del próximo año a partir del actual.

### Cuándo usarla

- Preparar el presupuesto del próximo año a partir del actual
- Crear una revisión a partir del presupuesto aprobado
- Trasladar proyecciones con un factor de inflación

### Campos

| Campo | Descripción |
|-------|-------------|
| **Año de origen** | Año del que copiar (rango: año actual menos uno hasta año actual más cinco) |
| **Columna de origen** | Presupuesto, Revisión, Seguimiento o Aterrizaje previsto |
| **Año de destino** | Año al que copiar (mismo rango) |
| **Columna de destino** | Presupuesto, Revisión, Seguimiento o Aterrizaje previsto |
| **Porcentaje de aumento** | Ajuste aplicado a los valores copiados (p. ej., `3` = +3%). Predeterminado: 0. Acepta decimales. |
| **Sobrescribir datos existentes** | Conmutador. Cuando está desactivado, los elementos que ya tienen un valor en el destino se omiten. Cuando está activado, todos los valores de destino se reemplazan. |

### Proceso en dos pasos: Simulación, luego Copiar

1. Haga clic en **Simulación** para generar una vista previa sin cambiar ningún dato
2. Revise la cuadrícula de vista previa, que muestra:
   - Nombre del **Producto** (los elementos etiquetados `[OMITIR]` no se modificarán)
   - **Valor de origen** (del año/columna de origen)
   - **Valor actual de destino**
   - **Valor de vista previa** (lo que será el destino después de la copia)
3. Cuando esté satisfecho, haga clic en **Copiar datos** para aplicar

El botón **Copiar datos** solo se habilita después de una simulación exitosa.

### Estadísticas resumen

Debajo de la cuadrícula, una barra de estadísticas muestra:

- **Total de elementos** en el conjunto de datos
- **Elementos a procesar** (no omitidos)
- **Total de origen** (suma de valores de origen)
- **Total actual de destino**
- **Total de vista previa** (mostrado después de la simulación)

### Comportamiento de sobrescritura

| Sobrescribir | El destino tiene datos | Resultado |
|--------------|------------------------|-----------|
| Desactivado | Sí | Omitido |
| Desactivado | No (cero) | Copiado |
| Activado | Sí | Reemplazado |
| Activado | No (cero) | Copiado |

### Protección de columnas congeladas

Si la columna de destino está congelada, tanto **Simulación** como **Copiar datos** están deshabilitados. Un banner de error le indica que descongele primero.

---

## Copiar asignaciones

Copie métodos y porcentajes de asignación de un año a otro para todas las partidas OPEX. Esto le ahorra tener que volver a introducir las configuraciones de contracargo al configurar un nuevo ejercicio fiscal.

### Cuándo usarla

- Preparar el presupuesto del próximo año con las mismas asignaciones de costes
- Trasladar las configuraciones de contracargo
- Configurar un nuevo ejercicio fiscal

### Campos

| Campo | Descripción |
|-------|-------------|
| **Año de origen** | Año del que copiar asignaciones (rango: año actual menos uno hasta año actual más cinco) |
| **Año de destino** | Año al que copiar asignaciones (mismo rango). Debe ser diferente del Año de origen. |
| **Sobrescribir datos existentes** | Conmutador. Cuando está desactivado, los elementos que ya tienen asignaciones en el destino se omiten. |

### Proceso en dos pasos: Simulación, luego Copiar

1. Haga clic en **Simulación** para ver una vista previa
2. La cuadrícula de vista previa muestra cada partida OPEX con:
   - Nombre del **Producto**
   - **Acción** -- qué sucederá (Se copiará, Omitir -- sin año de origen, Omitir -- sin asignaciones en origen, Omitir -- el destino tiene datos, Error)
   - Método y etiqueta del **Origen**
   - Método y etiqueta del **Destino** actual
   - **Resultado después de copiar** -- cómo quedará el destino
3. Haga clic en **Copiar datos** para aplicar

### Validación

- Los años de origen y destino deben ser diferentes. Si coinciden, aparece un banner de advertencia y ambos botones se deshabilitan.
- Cambiar cualquier filtro borra la vista previa, requiriendo una nueva simulación.

### Resumen

Después de una simulación, un banner muestra el conteo de elementos listos para copiar, omitidos y con errores. Si se omitieron elementos porque el destino ya tiene asignaciones, aparece una advertencia separada sugiriendo activar la sobrescritura.

---

## Restablecer columna presupuestaria

Borre todos los datos de una columna presupuestaria específica para un año determinado. Esta es una operación destructiva -- utilícela cuando necesite comenzar de cero.

### Cuándo usarla

- Comenzar de nuevo con la planificación presupuestaria
- Corregir errores masivos de entrada de datos
- Borrar datos de prueba

### Campos

| Campo | Descripción |
|-------|-------------|
| **Año** | El ejercicio fiscal a borrar (rango: año actual menos uno hasta año actual más cinco) |
| **Columna presupuestaria** | Presupuesto, Revisión, Seguimiento o Aterrizaje previsto |

### Vista previa

La página carga una cuadrícula mostrando cada partida OPEX y su valor actual en la columna seleccionada. Los elementos con datos se resaltan en rojo. Debajo de la cuadrícula aparecen tres estadísticas:

- **Total de elementos**
- **Elementos con datos** (serán borrados)
- **Valor total actual**

### Confirmación

Al hacer clic en **Borrar columna** se abre un diálogo de confirmación que muestra:

- La columna y año que se restablecerán
- El número de elementos afectados
- El valor total que se eliminará
- Una advertencia clara de que esta acción no se puede deshacer

Debe hacer clic en **Borrar columna** en el diálogo para proceder, o **Cancelar** para abortar.

### Medidas de seguridad

- El botón **Borrar columna** está deshabilitado cuando no hay datos que borrar
- Las columnas congeladas no pueden restablecerse -- descongele primero
- El diálogo de confirmación requiere reconocimiento explícito

---

## Ejemplo de flujo de trabajo: Ciclo presupuestario anual

A continuación se muestra una secuencia típica usando estas herramientas:

### 1. Fin del año N

1. Congelar el realizado del Año N (proteger datos históricos)
2. Copiar Presupuesto N a Presupuesto N+1 (con un porcentaje de aumento por inflación)
3. Copiar asignaciones de N a N+1

### 2. Durante la planificación presupuestaria (N+1)

1. Los equipos editan la columna Presupuesto N+1
2. El director financiero revisa y aprueba

### 3. Aprobación del presupuesto

1. Congelar el Presupuesto N+1 (bloquear el presupuesto aprobado)
2. Copiar Presupuesto N+1 a Revisión N+1 (punto de partida para el seguimiento intra-anual)

### 4. Revisión a mitad de año

1. Los equipos actualizan la Revisión N+1 con cambios de previsión
2. Cuando se finaliza, congelar la Revisión N+1

---

## Consejos

- **Siempre haga una simulación primero**: Copiar columnas presupuestarias y Copiar asignaciones admiten simulación. Úsela cada vez para verificar el resultado antes de confirmar.
- **Congele después de la aprobación**: Bloquear columnas después de la aprobación mantiene su registro de auditoría y previene ediciones accidentales.
- **Use ajustes porcentuales**: Al copiar entre años, aplique un factor de inflación o crecimiento para no tener que ajustar cada línea manualmente.
- **Verifique el estado de congelación antes de operaciones masivas**: Las columnas congeladas bloquean las operaciones de copia y restablecimiento. Si un botón está en gris, verifique la página de Congelación primero.
- **Restablezca con precaución**: El restablecimiento de columna es irreversible. Compruebe el año y la columna antes de confirmar.

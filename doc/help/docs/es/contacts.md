# Contactos

Los Contactos documentan las personas con las que trabaja -- gestores de cuenta de proveedores, ingenieros de soporte, consultores y otras partes interesadas externas. Vincule contactos a proveedores para crear un directorio de contactos de proveedores, y referencíelos desde aplicaciones y ubicaciones para información de soporte.

## Primeros pasos

Navegue a **Datos maestros > Contactos** para ver su directorio de contactos. Haga clic en **Nuevo** para crear su primera entrada.

**Campos obligatorios**:
- **Correo electrónico**: La dirección de correo del contacto (se usa como identificador único)

**Muy recomendados**:
- **Nombre** / **Apellido**: El nombre del contacto
- **Proveedor**: Para qué proveedor trabaja este contacto
- **Tipo de contacto**: El rol del contacto en el proveedor (Comercial, Técnico, Soporte u Otro) -- disponible una vez seleccionado un proveedor

**Opcionales pero útiles**:
- **Puesto de trabajo**: Su cargo o posición
- **Teléfono** / **Móvil**: Números de teléfono, introducidos con un código de país
- **País**: Ubicación (código de país ISO)

**Consejo**: Vincule primero los contactos a los proveedores, luego referencíelos desde aplicaciones y ubicaciones para información de soporte consistente.

---

## Trabajar con la lista

La cuadrícula de Contactos proporciona un directorio buscable de todos los contactos externos. Cada celda de una fila es un enlace clicable que abre el espacio de trabajo del contacto.

**Columnas predeterminadas**:
- **Apellido** / **Nombre**: Nombre del contacto
- **Proveedor**: El proveedor para el que trabaja
- **Correo electrónico**: Dirección de correo
- **Activo**: Si el contacto está actualmente activo (Sí / No)

**Columnas adicionales** (mediante el selector de columnas):
- **Puesto de trabajo**: Su cargo
- **Teléfono** / **Móvil**: Números de teléfono
- **País**: Ubicación
- **Creado**: Cuándo se creó el registro

**Ordenación predeterminada**: Por apellido, alfabético.

**Acciones**:
- **Nuevo**: Crear un nuevo contacto (requiere `contacts:manager`)
- **Importar CSV**: Importación masiva de contactos (requiere `contacts:admin`)
- **Exportar CSV**: Exportar a CSV (requiere `contacts:admin`)
- **Eliminar seleccionados**: Eliminar los contactos seleccionados (requiere `contacts:admin`)

---

## El espacio de trabajo de Contactos

Haga clic en cualquier fila para abrir el espacio de trabajo. Tiene una pestaña.

### Visión general

**Qué puede editar**:
- **Correo electrónico**: Dirección de correo (obligatorio)
- **Nombre** / **Apellido**: Nombre del contacto
- **Proveedor**: Vincular a un proveedor de los datos maestros
- **Tipo de contacto**: El rol del contacto en el proveedor -- Comercial, Técnico, Soporte u Otro. Este campo está disponible una vez seleccionado un proveedor. Si elimina el proveedor, el tipo de contacto también se elimina.
- **Puesto de trabajo**: Su cargo o posición
- **Teléfono** / **Móvil**: Números de teléfono. Cada uno tiene un selector de código de país junto al campo de número local. Introducir un código de país sugiere automáticamente el país si no hay ninguno configurado.
- **País**: Ubicación, seleccionada de una lista buscable de códigos de país ISO
- **Activo**: Si este contacto está actualmente activo
- **Notas**: Notas de texto libre (hasta 2.000 caracteres)

---

## Dónde se usan los contactos

Los contactos aparecen en varios lugares de KANAP.

### Contactos de proveedor

Cada proveedor tiene una pestaña de **Contactos** que muestra todos los contactos vinculados a ese proveedor. Puede crear un nuevo contacto directamente desde el espacio de trabajo del proveedor:

1. Abra el espacio de trabajo del proveedor y vaya a la pestaña **Contactos**.
2. Haga clic en **Crear** junto a un rol de contacto.
3. Complete los datos del contacto -- el proveedor y el tipo de contacto están prerrellenados.
4. Después de guardar, se le devuelve automáticamente al espacio de trabajo del proveedor.

### Soporte de aplicaciones

En el espacio de trabajo de Aplicaciones, la pestaña **Técnico y soporte** referencia contactos para la escalación del soporte.

### Contactos de ubicación

Las ubicaciones pueden tener contactos de soporte (gestores de instalaciones, contactos del NOC, etc.).

---

## Importación/exportación CSV

Gestione contactos de forma masiva usando CSV.

**Exportar**: Descarga todos los contactos con sus detalles.

**Importar**:
- Utilice **Verificación previa** para validar antes de aplicar
- Coincidencia por dirección de correo electrónico
- Puede crear nuevos contactos o actualizar los existentes

**Campos obligatorios**: Correo electrónico

**Campos opcionales**: Nombre, Apellido, Nombre del proveedor, Puesto de trabajo, Teléfono, Móvil, País, Activo

**Notas**:
- Utilice codificación **UTF-8** y **puntos y coma** como separadores
- El proveedor se busca por nombre -- asegúrese de que el proveedor exista antes de importar

---

## Consejos

- **Siempre establezca un proveedor**: Vincular contactos a proveedores los hace más fáciles de encontrar y gestionar.
- **Establezca el tipo de contacto**: Una vez vinculado un proveedor, elija si el contacto es Comercial, Técnico, Soporte u Otro. Esto ayuda al consultar contactos desde el espacio de trabajo del proveedor.
- **Use nomenclatura consistente**: Introduzca nombres en un formato consistente (p. ej., siempre "Nombre Apellido").
- **Marque contactos inactivos**: Cuando alguien deja un proveedor, márquelo como inactivo en lugar de eliminarlo -- esto preserva el registro de auditoría.
- **Incluya puestos de trabajo**: Los puestos de trabajo ayudan a identificar el contacto adecuado para diferentes necesidades (ventas vs. soporte vs. gestión de cuenta).

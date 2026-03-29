# Personalización

Use la página de Personalización para aplicar la identidad de su empresa en KANAP.

Ruta: `/admin/branding`

## Acceso y alcance

- Permiso requerido: `users:admin`
- Disponible solo en hosts de espacio de trabajo (no en el host de administración de plataforma)
- Los cambios se aplican solo a su espacio de trabajo actual

## Qué puede personalizar

- **Logotipo**
  - Aparece en la barra superior de la aplicación (cuando ha iniciado sesión)
  - Aparece en el encabezado de la página de inicio de sesión
- **Colores primarios**
  - Un color primario para el **modo claro**
  - Un color primario para el **modo oscuro**
  - Utilizados por las barras de aplicación, botones primarios y enlaces

## Configuración del logotipo

### Archivos soportados

- Formatos: `PNG`, `JPG/JPEG`, `GIF`, `WEBP`
- Tamaño máximo: `20 MB`

### Formato de logotipo recomendado

- Use un logotipo ancho y horizontal (fondo transparente preferido)
- Mantenga el contenido importante centrado (el área del encabezado es compacta)
- Para una representación nítida, use al menos ~2x del tamaño de visualización (por ejemplo `280x72` o superior)

### Acciones

1. Haga clic en **Subir logotipo** y elija su archivo.
2. Use las vistas previas integradas de encabezado claro y oscuro para validar la apariencia.
3. Active **Mostrar logotipo en modo oscuro** si es necesario.
4. Haga clic en **Guardar cambios** para publicar.

Para eliminar el logotipo, haga clic en **Eliminar logotipo**.

Cuando no hay logotipo establecido (o la visualización del logotipo en modo oscuro está deshabilitada), KANAP vuelve a la marca predeterminada de texto/icono.

## Configuración del color primario

### Cómo elegir colores

Puede establecer colores usando:
- Entrada hexadecimal (`#RRGGBB`)
- Botón de selector de color
- Fichas de paleta predefinida
- Botón **Borrar** (eliminar valor personalizado)

### Comportamiento claro/oscuro

- El **primario del modo claro** se usa en el modo claro.
- El **primario del modo oscuro** se usa en el modo oscuro.
- Si solo se establece un color, KANAP lo reutiliza en ambos modos.
- Si ambos están vacíos, KANAP usa los colores predeterminados.

### Advertencia de contraste

La página muestra una advertencia si el contraste es bajo.
Esta advertencia es informativa (aún puede guardar), pero un contraste bajo puede reducir la legibilidad.

## Guardar, descartar y restablecer

- **Guardar cambios**: aplica el logotipo subido + configuración de colores
- **Descartar**: revierte las ediciones no guardadas de la página
- **Restablecer valores predeterminados**: elimina el logotipo y borra todos los colores personalizados

Restablecer requiere confirmación.

## Consejos para resultados profesionales

- Pruebe en ambos modos de tema claro y oscuro antes de guardar.
- Mantenga los colores de marca legibles contra fondos blancos y oscuros.
- Prefiera logotipos simples con fondo transparente para la representación más limpia del encabezado.
- Use Restablecer para recuperar rápidamente los valores predeterminados si un estilo de prueba no es satisfactorio.

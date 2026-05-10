# Integraciones

Use la página Integraciones para conectar KANAP con herramientas de terceros que complementan los datos que ya gestiona en la plataforma. Hoy, la página se centra en la **importación de tickets de GLPI** mediante Plaid; con el tiempo se irán añadiendo nuevas integraciones aquí.

## Dónde encontrarlo

- Espacio de trabajo: **Administración**
- Ruta: **Administración → Integraciones**
- Ruta: `/admin/integrations`
- Permiso: `ai_settings:admin`
- Indicador de funcionalidad: comparte la misma superficie `ai_settings` que la página de configuración de Plaid. Cuando la superficie está desactivada, la entrada no aparece en la barra lateral.

## Integración con GLPI

[GLPI](https://glpi-project.org/) es una herramienta popular de código abierto para la gestión de servicios IT. La integración permite a su equipo pedir a Plaid que encuentre tickets en GLPI e importe los relevantes a KANAP como tareas, con un paso de confirmación en cada importación.

### Cómo funciona

1. Un usuario final pide a Plaid algo como "importar los tickets GLPI abiertos asignados a mi equipo".
2. Plaid consulta GLPI con las credenciales que configura aquí.
3. Los tickets candidatos se devuelven como vista previa en el chat.
4. El usuario revisa la vista previa y hace clic en **Aprobar** para los tickets que quiere traer a KANAP.
5. KANAP crea una tarea por cada ticket aprobado.

Nada se escribe en KANAP sin esa aprobación explícita, de modo que los administradores pueden entregar la integración a los usuarios finales sin preocuparse por una rotación silenciosa de datos.

### Requisitos previos

- **El chat de Plaid debe estar habilitado** en su espacio de trabajo. La página muestra un tooltip informativo junto al título de la sección para recordarle esta dependencia. La integración se configura espacio de trabajo por espacio de trabajo; las credenciales a continuación nunca salen de su espacio de trabajo.
- Una instancia de GLPI accesible desde KANAP por HTTPS.
- Un **Token de usuario** para una cuenta de usuario de GLPI que tenga acceso de lectura a los tickets que desea exponer.
- Un **Token de aplicación** opcional si su instancia de GLPI requiere autenticación a nivel de aplicación.

### Campos

El formulario de configuración contiene:

- **Habilitar importación de tickets GLPI** — conmutador maestro para la integración. Cuando está desactivado, Plaid no intentará consultar GLPI incluso si las credenciales están establecidas.
- **URL de GLPI** — la URL base de su instancia de GLPI, por ejemplo `https://glpi.example.com`.
- **Token de usuario** — el token API personal de la cuenta GLPI que Plaid usará. Los tokens existentes se enmascaran; deje el campo en blanco durante un guardado o prueba para conservar el valor almacenado.
- **Token de aplicación** — el token de aplicación opcional de GLPI. Mismo comportamiento de blanco-para-conservar que el token de usuario.

### Acciones

- **Guardar configuración** — persiste el formulario. Los tokens introducidos en el formulario reemplazan los almacenados; los campos de token en blanco conservan lo que ya está almacenado.
- **Probar conexión** — ejecuta una ida y vuelta autenticada contra la URL de GLPI usando los valores del formulario (o, donde estén en blanco, los valores almacenados). La banda de resultado muestra éxito o el error subyacente junto con la latencia.

### Almacenamiento de secretos

Si su instancia de KANAP no tiene un almacén de secretos configurado, aparece un texto de ayuda bajo cada campo de token advirtiéndole que los valores no pueden persistirse. Configure el almacenamiento de secretos a nivel de instancia antes de confiar en esta integración en producción.

## Consejos

- **Use una cuenta GLPI dedicada**: cree una cuenta de servicio en GLPI con justo los permisos suficientes para leer las categorías de tickets que desea exponer. Eso mantiene la pista de auditoría limpia y le permite revocar el acceso sin afectar a un usuario real.
- **Pruebe antes de anunciar**: ejecute **Probar conexión** después de cada cambio de URL o tokens. El mensaje de error es mucho más accionable que un fallo que aparece dentro de la conversación de chat de alguien.
- **Combine con permisos de Plaid**: solo los usuarios con `ai_chat:reader` pueden pedir a Plaid que importe tickets. Combine eso con acceso basado en roles a las tareas si desea limitar quién crea realmente registros de tareas a partir de las importaciones.
- **Planifique la rotación de tokens**: los tokens personales de GLPI pueden regenerarse. Cuando lo haga, guarde el nuevo valor aquí y ejecute la prueba de conexión antes de que los usuarios vuelvan a usar la integración.

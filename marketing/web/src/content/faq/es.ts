import type { FaqContent } from './types';

const content: FaqContent = {
  meta: {
    title: 'FAQ',
    description:
      'Preguntas frecuentes sobre precios, licencia, autoalojamiento, planes cloud, Plaid, soporte y facturación de KANAP.',
  },
  header: {
    eyebrow: 'FAQ',
    title: 'Preguntas frecuentes.',
    lead:
      'Todo lo que necesitas saber sobre KANAP, licencia, precios, hosting y Plaid. Si no encuentras tu respuesta, escríbenos.',
  },
  groups: [
    {
      label: 'Licencia y código abierto',
      items: [
        {
          q: '¿Bajo qué licencia está KANAP?',
          a: 'KANAP se publica bajo licencia <a href="https://www.gnu.org/licenses/agpl-3.0.html" rel="noopener" target="_blank">AGPL v3</a>, una licencia de código abierto ampliamente reconocida y aprobada por la OSI. Puedes usar, modificar y distribuir el software libremente. La cláusula copyleft de AGPL asegura que quien ejecute una versión modificada como servicio debe compartir sus cambios. Eso protege a la comunidad y mantiene KANAP realmente abierto.',
        },
        {
          q: '¿Puedo usar KANAP comercialmente?',
          a: 'Sí. Uso interno, uso comercial, SaaS externo, todo está permitido. La cláusula copyleft solo te obliga a compartir modificaciones si ejecutas una versión modificada como servicio en red. El uso puramente interno no genera ninguna obligación.',
        },
        {
          q: '¿Puedo contribuir a KANAP?',
          a: 'Sí, por favor. Todo el código fuente está en <a href="https://github.com/kanap-it/kanap" rel="noopener" target="_blank">GitHub</a>. Issues, pull requests y debates son bienvenidos. Consulta CONTRIBUTING.md para las pautas.',
        },
      ],
    },
    {
      label: 'Cloud y prueba',
      items: [
        {
          q: '¿Cómo funciona la prueba gratuita?',
          a: 'Cada plan cloud de pago comienza con una prueba gratuita de 14 días. Sin tarjeta de crédito. Acceso completo a todas las funcionalidades, más una sesión de activación de 60 minutos gratuita por empresa si se reserva durante la prueba.',
        },
        {
          q: '¿Qué pasa cuando termina mi prueba?',
          a: 'Tras los 14 días de prueba debes elegir un plan de pago para continuar. Tu tenant sigue disponible 30 días más con acceso limitado. Pasado ese periodo de 30 días, tu tenant se elimina.',
        },
        {
          q: '¿Qué es la sesión de activación gratuita?',
          a: 'Cada prueba incluye una sesión de activación de 60 minutos gratuita por empresa. Tras la suscripción te enviamos un email para agendar la llamada. La sesión es una videollamada centrada en los primeros hitos de valor según tus objetivos principales.',
        },
        {
          q: '¿Cuál es la diferencia entre cloud y autoalojado?',
          a: 'El hosting cloud significa que nosotros gestionamos todo, actualizaciones, copias de seguridad, infraestructura. Autoalojado significa que ejecutas KANAP en tus propios servidores. Los planes cloud de pago (Starter, Standard, Max) incluyen hosting cloud; el plan gratuito es solo autoalojado. Puedes contratar Soporte autoalojado para instalaciones autoalojadas.',
        },
      ],
    },
    {
      label: 'Autoalojamiento y soporte',
      items: [
        {
          q: '¿Qué es el Soporte autoalojado?',
          a: 'El Soporte autoalojado es un complemento de soporte profesional para instalaciones autoalojadas. Incluye soporte por email prioritario, ayuda con instalación y actualizaciones, y 20 % de descuento en servicios de consultoría. Precio: 2 490 €/año.',
        },
        {
          q: '¿Cómo funciona el soporte prioritario?',
          a: 'Para suscriptores de pago: escríbenos por cualquier incidencia operativa. Apuntamos a responder en 24h y resolver tu problema. Es best-effort, sin SLA, pero somos personas reales que leen y responden cada mensaje.',
        },
      ],
    },
    {
      label: 'Facturación',
      items: [
        {
          q: '¿Puedo pagar por factura?',
          a: 'El pago por factura (transferencia bancaria) está disponible para suscripciones superiores a 1 000 € solo para clientes EUR. Hoy esto significa Standard anual, Max anual y Soporte autoalojado. Las suscripciones iguales o inferiores a 1 000 € se pagan con tarjeta. Las facturas son NET30.',
        },
        {
          q: '¿Puedo subir o bajar de plan?',
          a: 'Sí. Cambia entre Starter, Standard y Max en cualquier momento desde los ajustes de tu workspace. Si subes a mitad de ciclo, se te cobra la diferencia prorrateada. La bajada se aplica al final de tu periodo de facturación.',
        },
        {
          q: '¿Puedo cancelar mi suscripción?',
          a: 'Por supuesto. Cancela desde tu Centro de facturación cuando quieras, tu suscripción sigue activa hasta el final del periodo de facturación actual, sin preguntas.',
        },
      ],
    },
    {
      label: 'Plaid (asistente de IA)',
      items: [
        {
          q: '¿Cuál es la diferencia entre los mensajes Plaid incluidos y Bring Your Own Key?',
          a: 'Cada plan cloud incluye una cantidad generosa de mensajes Plaid, alimentados por un modelo intermedio que hemos seleccionado y probado cuidadosamente con KANAP. Para respuestas aún más capaces, la opción Bring Your Own Key te permite conectar modelos de última generación de OpenAI, Anthropic o cualquier proveedor compatible. BYOK también te da control total sobre cómo se procesan tus datos, y elimina cualquier límite de mensajes.',
        },
        {
          q: '¿Cómo puedo controlar Plaid?',
          a: 'A nivel de plataforma, Plaid se puede desactivar totalmente, activar en modo solo lectura, o activar en modo lectura-escritura (con vista previa y confirmación para todos los cambios). La búsqueda web y MCP se activan o desactivan por separado. A nivel de usuario, controlas quién accede a qué funcionalidad Plaid mediante permisos por rol. El RBAC se aplica siempre, Plaid nunca ve más de lo que el usuario tiene permitido.',
        },
      ],
    },
  ],
  cta: {
    title: '¿Aún tienes dudas?',
    body: 'Escríbenos, leemos cada mensaje.',
    primary: 'Contáctanos',
    secondary: 'Empezar prueba gratuita',
  },
};

export default content;

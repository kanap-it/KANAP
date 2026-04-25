import type { ContactContent } from './types';

const content: ContactContent = {
  meta: {
    title: 'Contacto',
    description:
      'Ponte en contacto. Demos de producto, dudas de despliegue, coordinación de compras, partenariados, respondemos en un día hábil.',
  },
  header: {
    eyebrow: 'Contacto',
    title: 'Nos encantaría saber de ti.',
    lead: 'Demo, pregunta de despliegue, compras, partenariado — sea cual sea el motivo, leemos cada mensaje.',
  },
  responsePromise: 'Respuesta en un día hábil',
  highlightsLabel: 'En qué podemos ayudar',
  highlights: [
    'Demos de producto y acompañamiento en onboarding',
    'Coordinación de compras y facturación',
    'Instalación y actualización en autoalojado',
    'Partenariados e integraciones',
  ],
  form: {
    nameLabel: 'Nombre completo',
    emailLabel: 'Email profesional',
    companyLabel: 'Empresa',
    messageLabel: '¿En qué podemos ayudarte?',
    messagePlaceholder: 'Cuéntanos brevemente qué buscas.',
    submitLabel: 'Enviar mensaje',
    submitting: 'Enviando…',
    successTitle: 'Mensaje enviado.',
    successBody: 'Te responderemos en un día hábil.',
    errorGeneric: 'Algo ha fallado. Inténtalo de nuevo o escribe directamente a admin@kanap.net.',
  },
  alternate: {
    label: '¿Prefieres email directo?',
    email: 'admin@kanap.net',
  },
};

export default content;

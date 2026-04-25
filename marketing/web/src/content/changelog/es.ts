import type { ChangelogContent } from './types';

const content: ChangelogContent = {
  meta: {
    title: 'Changelog',
    description:
      'Cambios relevantes en KANAP. Nuevas funcionalidades, mejoras y correcciones a medida que se publican. Los usuarios autoalojados siguen la misma cronología.',
  },
  header: {
    eyebrow: 'Changelog',
    title: 'Novedades en KANAP.',
    lead:
      'Lo destacado de lo que publicamos entre versiones. Para el registro técnico completo, sigue el repositorio de GitHub.',
  },
  subscribe: {
    label: 'Sigue el ritmo',
    body: 'Las nuevas versiones salen con frecuencia. Marca el repositorio con estrella o sigue las releases en GitHub para estar al día.',
    githubCta: 'Ver releases en GitHub',
    githubHref: 'https://github.com/kanap-it/kanap/releases',
  },
  entries: [
    {
      date: '2026-04-24',
      title: 'Nuevo sitio de marketing.',
      summary:
        'El sitio de marketing se ha rediseñado por completo para alinearse con la nueva estética de la app KANAP. El código abierto pasa a ser el eje principal, y el autoalojamiento su ciudadano de primera clase.',
      sections: [
        {
          label: 'Entregado',
          items: [
            'Renovación visual completa, paleta teal + neutros, modo oscuro obligatorio, densidad estilo Linear',
            'Página dedicada de autoalojamiento / on-premise con detalle profundo',
            'Nuevas páginas de changelog y seguridad',
            'Build estático con Astro 5, URLs limpias, enrutado i18n correcto',
            'Multilingüe desde el primer día: inglés, francés, alemán, español',
          ],
        },
      ],
    },
    {
      date: '2026-04-01',
      title: 'Renovación de diseño en toda la app.',
      summary:
        'La aplicación KANAP se ha rediseñado bajo una carta de "densidad refinada": solo Inter 400/500, teal para elementos interactivos, neutro para todo lo demás, modo oscuro obligatorio en cada superficie.',
      sections: [
        {
          label: 'Cambiado',
          items: [
            'Design tokens unificados en `kanapPalette` con modos claro y oscuro',
            'Primitivas PropertyRow / PropertyGroup reemplazan cualquier uso de MUI FormControl',
            'Las páginas de workspace (tareas, proyectos, solicitudes) siguen un layout de detalle compartido',
            'Overrides personalizados de AG Grid protegen el texto de las celdas del teal invasivo',
            'Auto-guardado en todas las ediciones in-place; envíos explícitos reservados a creaciones y composers',
          ],
        },
      ],
    },
  ],
};

export default content;

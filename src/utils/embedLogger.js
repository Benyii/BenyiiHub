// src/utils/embedLogger.js

/**
 * Devuelve el color según el tipo de log.
 *
 * info    → azul
 * warning → amarillo
 * error   → rojo
 * success → verde
 */
function getColorByLevel(level) {
  switch (level) {
    case 'info':
      return 0x3498db; // azul
    case 'warning':
      return 0xf1c40f; // amarillo
    case 'error':
      return 0xe74c3c; // rojo
    case 'success':
      return 0x2ecc71; // verde
    default:
      return 0x95a5a6; // gris por defecto
  }
}

/**
 * Construye un embed estándar de log usando la info del bot.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} options
 * @param {'info'|'warning'|'error'|'success'} options.level
 * @param {string} options.title
 * @param {string} options.description
 */
function buildLogEmbed(client, { level, title, description }) {
  const color = getColorByLevel(level);
  const avatarUrl = client.user.displayAvatarURL();

  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    author: {
      name: client.user.tag,
      icon_url: avatarUrl
    },
    thumbnail: {
      url: avatarUrl
    },
    footer: {
      text: `Nivel: ${level.toUpperCase()}`
    }
  };
}

/**
 * Construye un embed especializado para errores, con stack truncado.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {Error|string} options.error
 */
function buildErrorEmbed(client, { title, description, error }) {
  const avatarUrl = client.user.displayAvatarURL();
  const color = getColorByLevel('error');

  let stack = '';
  if (error instanceof Error) {
    stack = error.stack || error.message || String(error);
  } else {
    stack = String(error);
  }

  const maxLen = 900; // espacio razonable para no reventar el embed
  if (stack.length > maxLen) {
    stack = stack.slice(0, maxLen - 3) + '...';
  }

  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    author: {
      name: client.user.tag,
      icon_url: avatarUrl
    },
    thumbnail: {
      url: avatarUrl
    },
    footer: {
      text: 'Nivel: ERROR'
    },
    fields: [
      {
        name: 'Detalle del error',
        value: '```' + stack + '```'
      }
    ]
  };
}

module.exports = {
  buildLogEmbed,
  buildErrorEmbed
};

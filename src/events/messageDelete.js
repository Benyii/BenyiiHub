// src/events/messageDelete.js
const { sendUserEventLog } = require('../services/userEventLogService');
const logger = require('../config/logger');

function getAttachmentSummaryAndImage(attachmentsCollection) {
  const attachments = Array.from(attachmentsCollection.values());
  if (!attachments.length) return { attachmentsText: '', imageUrl: null };

  let attachmentsText = '📎 **Adjuntos:**\n';
  let imageUrl = null;

  attachments.forEach((att, idx) => {
    const name = att.name || `archivo-${idx + 1}`;
    const url = att.url || '';
    attachmentsText += `${idx + 1}. [${name}](${url})\n`;
  });

  // Detectar primera imagen
  const imageAtt = attachments.find(att => {
    const ct = att.contentType || '';
    const name = att.name || '';
    return (ct.startsWith('image/')) || /\.(png|jpe?g|gif|webp)$/i.test(name);
  });

  if (imageAtt) {
    imageUrl = imageAtt.url || null;
  }

  return { attachmentsText, imageUrl };
}

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    try {
      // Ignorar DMs y mensajes del propio bot
      if (!message.guild) return;
      if (message.author?.bot) return;

      const guildId = message.guild.id;
      const author = message.author;

      const content = message.content && message.content.trim().length
        ? message.content
        : '(sin contenido de texto o no disponible)';

      const { attachmentsText, imageUrl } = getAttachmentSummaryAndImage(message.attachments);

      let description =
        `🗑️ **Mensaje borrado**\n` +
        `Autor: ${author.tag} (${author.id})\n` +
        `Canal: <#${message.channel.id}> (${message.channel.id})\n` +
        `ID del mensaje: \`${message.id}\`\n` +
        `Creado: <t:${Math.floor(message.createdTimestamp / 1000)}:F>\n\n` +
        `**Contenido:**\n` +
        '```' + (content.length > 1900 ? content.slice(0, 1897) + '...' : content) + '```';

      if (attachmentsText) {
        description += `\n${attachmentsText}`;
      }

      await sendUserEventLog(client, guildId, {
        title: 'Mensaje borrado',
        description,
        imageUrl
      });
    } catch (err) {
      logger.error('Error en messageDelete event:', err);
    }
  }
};

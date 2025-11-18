// src/events/messageUpdate.js
const { sendUserEventLog } = require('../services/userEventLogService');
const { getUserLogFlags } = require('../services/guildService');
const logger = require('../config/logger');

function getAttachmentSummaryAndImage(attachmentsCollection) {
  const attachments = Array.from(attachmentsCollection.values());
  if (!attachments.length) return { attachmentsText: '', imageUrl: null };

  let attachmentsText = '📎 **Adjuntos actuales:**\n';
  let imageUrl = null;

  attachments.forEach((att, idx) => {
    const name = att.name || `archivo-${idx + 1}`;
    const url = att.url || '';
    attachmentsText += `${idx + 1}. [${name}](${url})\n`;
  });

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
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    try {
      if (!newMessage.guild) return;
      if (newMessage.author?.bot) return;

      try {
        if (oldMessage.partial) oldMessage = await oldMessage.fetch();
        if (newMessage.partial) newMessage = await newMessage.fetch();
      } catch (fetchErr) {
        logger.warn('No se pudo fetch en messageUpdate (partial):', fetchErr);
      }

      const guildId = newMessage.guild.id;

      // 👇 revisar config
      const flags = await getUserLogFlags(guildId);
      if (!flags.messageEdit) return;

      const author = newMessage.author;

      const oldContent = oldMessage.content || '(sin contenido o no disponible)';
      const newContent = newMessage.content || '(sin contenido o no disponible)';

      if (oldContent === newContent &&
          oldMessage.attachments?.size === newMessage.attachments?.size) {
        return;
      }

      const { attachmentsText, imageUrl } = getAttachmentSummaryAndImage(newMessage.attachments);

      let description =
        `✏️ **Mensaje editado**\n` +
        `Autor: ${author.tag} (${author.id})\n` +
        `Canal: <#${newMessage.channel.id}> (${newMessage.channel.id})\n` +
        `ID del mensaje: \`${newMessage.id}\`\n` +
        `Creado: <t:${Math.floor(newMessage.createdTimestamp / 1000)}:F>\n` +
        (newMessage.editedTimestamp
          ? `Editado: <t:${Math.floor(newMessage.editedTimestamp / 1000)}:F>\n`
          : '') +
        `\n**Antes:**\n` +
        '```' + (oldContent.length > 900 ? oldContent.slice(0, 897) + '...' : oldContent) + '```\n' +
        `**Después:**\n` +
        '```' + (newContent.length > 900 ? newContent.slice(0, 897) + '...' : newContent) + '```';

      if (attachmentsText) {
        description += `\n${attachmentsText}`;
      }

      await sendUserEventLog(client, guildId, {
        title: 'Mensaje editado',
        description,
        imageUrl
      });
    } catch (err) {
      logger.error('Error en messageUpdate event:', err);
    }
  }
};

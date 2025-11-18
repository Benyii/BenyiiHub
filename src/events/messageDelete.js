// src/events/messageDelete.js

const { AuditLogEvent, getExecutorLine } = require('../utils/auditLogHelper');
const { getUserLogFlags } = require('../services/guildService');
const { sendUserEventLog } = require('../services/userEventLogService');
const logger = require('../config/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    try {
      // Ignorar DMs
      if (!message.guild) return;

      const guild = message.guild;
      const guildId = guild.id;

      // Respetar flags de configuración de logs de usuario
      const flags = await getUserLogFlags(guildId);
      if (!flags || !flags.user_log_message_delete) {
        return;
      }

      // Manejar partials: intentar completar el mensaje
      if (message.partial) {
        try {
          message = await message.fetch();
        } catch (err) {
          logger.warn('No se pudo hacer fetch del mensaje parcial borrado:', err);
        }
      }

      const channel = message.channel;
      const author = message.author || null;
      const nowTs = Math.floor(Date.now() / 1000);

      // Info básica de usuario
      const userLabel = author
        ? `${author.tag} (${author.id})`
        : 'Usuario desconocido (no disponible / mensaje parcial)';

      // Contenido del mensaje
      let contentText = '(sin contenido de texto)';
      if (message.content && message.content.trim().length > 0) {
        contentText = message.content;
      }

      // Adjuntos
      let attachmentsText = 'Sin adjuntos.';
      if (message.attachments && message.attachments.size > 0) {
        attachmentsText =
          message.attachments
            .map(att => `• ${att.name} — ${att.url}`)
            .join('\n');
      }

      // Línea de ejecutor desde audit logs (si está disponible)
      let executorLine = '';
      try {
        if (author) {
          executorLine = await getExecutorLine(
            guild,
            AuditLogEvent.MessageDelete,
            author.id
          );
        } else {
          executorLine = await getExecutorLine(
            guild,
            AuditLogEvent.MessageDelete,
            null
          );
        }
      } catch (err) {
        logger.warn('No se pudo obtener executorLine para messageDelete:', err);
      }

      const description =
        `🗑️ **Mensaje borrado**\n` +
        `Usuario: ${userLabel}\n` +
        `Canal: ${channel ? `${channel} (${channel.id})` : '(desconocido)'}\n` +
        (executorLine ? `${executorLine}\n` : '') +
        `Hora: <t:${nowTs}:F>\n\n` +
        `**Contenido:**\n` +
        (contentText ? `\`\`\`\n${contentText}\n\`\`\`\n` : '*(sin contenido)*\n') +
        `**Adjuntos:**\n${attachmentsText}`;

      await sendUserEventLog(client, guildId, {
        title: 'Mensaje eliminado',
        description
        // El servicio de userEventLogService se encarga de usar
        // el embedLogger con color INFO.
      });
    } catch (err) {
      logger.error('Error en messageDelete event:', err);
    }
  }
};

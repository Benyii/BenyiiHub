// src/events/channelDelete.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorLine } = require('../utils/auditLogHelper');
const logger = require('../config/logger');

function channelTypeName(type) {
  switch (type) {
    case 0: return 'Texto';
    case 2: return 'Voz';
    case 4: return 'Categoría';
    case 5: return 'Anuncios';
    case 13: return 'Stage';
    default: return `Tipo ${type}`;
  }
}

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    try {
      const guild = channel.guild;
      const guildId = guild?.id;
      if (!guildId) return;

      const tipo = channelTypeName(channel.type);
      const executorLine = await getExecutorLine(
        guild,
        AuditLogEvent.ChannelDelete,
        channel.id
      );

      const desc =
        `📁 **Canal eliminado**\n` +
        `Nombre: \`${channel.name}\`\n` +
        `ID: \`${channel.id}\`\n` +
        `Tipo: ${tipo}\n` +
        `${executorLine}\n` +
        `Hora: <t:${Math.floor(Date.now() / 1000)}:F>`;

      await sendAdminEventLog(client, guildId, {
        title: 'Canal eliminado',
        description: desc
      });
    } catch (err) {
      logger.error('Error en channelDelete event:', err);
    }
  }
};

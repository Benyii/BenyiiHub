// src/events/roleDelete.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorLine } = require('../utils/auditLogHelper');
const logger = require('../config/logger');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    try {
      const guild = role.guild;
      const guildId = guild?.id;
      if (!guildId) return;

      const executorLine = await getExecutorLine(
        guild,
        AuditLogEvent.RoleDelete,
        role.id
      );

      const desc =
        `🧱 **Rol eliminado**\n` +
        `Nombre: \`${role.name}\`\n` +
        `ID: \`${role.id}\`\n` +
        `${executorLine}\n` +
        `Hora: <t:${Math.floor(Date.now() / 1000)}:F>`;

      await sendAdminEventLog(client, guildId, {
        title: 'Rol eliminado',
        description: desc
      });
    } catch (err) {
      logger.error('Error en roleDelete event:', err);
    }
  }
};

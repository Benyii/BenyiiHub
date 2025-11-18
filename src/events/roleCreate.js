// src/events/roleCreate.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorLine } = require('../utils/auditLogHelper');
const logger = require('../config/logger');

module.exports = {
  name: 'roleCreate',
  async execute(role, client) {
    try {
      const guild = role.guild;
      const guildId = guild?.id;
      if (!guildId) return;

      const executorLine = await getExecutorLine(
        guild,
        AuditLogEvent.RoleCreate,
        role.id
      );

      const desc =
        `🧱 **Rol creado**\n` +
        `Rol: ${role.name} (\`${role.id}\`)\n` +
        `Color: \`#${role.color.toString(16).padStart(6, '0')}\`\n` +
        `Mencionable: ${role.mentionable ? 'Sí' : 'No'}\n` +
        `Posición: ${role.position}\n` +
        `${executorLine}\n` +
        `Hora: <t:${Math.floor(Date.now() / 1000)}:F>`;

      await sendAdminEventLog(client, guildId, {
        title: 'Rol creado',
        description: desc
      });
    } catch (err) {
      logger.error('Error en roleCreate event:', err);
    }
  }
};

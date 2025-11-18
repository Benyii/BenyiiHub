// src/events/guildBanAdd.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorAndReason } = require('../utils/auditLogHelper');
const logger = require('../config/logger');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    try {
      const guild = ban.guild;
      const guildId = guild?.id;
      if (!guildId) return;

      const user = ban.user;
      const userTag = `${user.tag} (${user.id})`;
      const nowTs = Math.floor(Date.now() / 1000);

      const { executor, reason } = await getExecutorAndReason(
        guild,
        AuditLogEvent.MemberBanAdd,
        user.id,
        30000
      );

      const execText = executor
        ? `Ejecutado por: ${executor.tag} (${executor.id})`
        : 'Ejecutado por: (no disponible / audit log no encontrado)';
      const reasonText = reason ? `Motivo: \`${reason}\`` : 'Motivo: (no especificado)';

      const description =
        `🚫 **Miembro baneado**\n` +
        `Usuario: ${userTag}\n` +
        `${execText}\n` +
        `${reasonText}\n` +
        `Hora: <t:${nowTs}:F>`;

      await sendAdminEventLog(client, guildId, {
        title: 'Miembro baneado',
        description
      });
    } catch (err) {
      logger.error('Error en guildBanAdd event:', err);
    }
  }
};

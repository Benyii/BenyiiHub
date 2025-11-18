// src/events/guildMemberRemove.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorAndReason } = require('../utils/auditLogHelper');
const logger = require('../config/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const guild = member.guild;
      if (!guild) return;

      const guildId = guild.id;
      const user = member.user;
      const userTag = `${user.tag} (${user.id})`;
      const nowTs = Math.floor(Date.now() / 1000);

      // 1) ¿Fue BAN?
      const banInfo = await getExecutorAndReason(
        guild,
        AuditLogEvent.MemberBanAdd,
        user.id,
        30000
      );

      if (banInfo.executor) {
        const execText = `Ejecutado por: ${banInfo.executor.tag} (${banInfo.executor.id})`;
        const reasonText = banInfo.reason ? `Motivo: \`${banInfo.reason}\`` : 'Motivo: (no especificado)';

        const description =
          `🚫 **Miembro baneado y removido del servidor**\n` +
          `Usuario: ${userTag}\n` +
          `${execText}\n` +
          `${reasonText}\n` +
          `Hora: <t:${nowTs}:F>`;

        await sendAdminEventLog(client, guildId, {
          title: 'Miembro baneado (salida del servidor)',
          description
        });

        return;
      }

      // 2) ¿Fue KICK?
      const kickInfo = await getExecutorAndReason(
        guild,
        AuditLogEvent.MemberKick,
        user.id,
        30000
      );

      if (kickInfo.executor) {
        const execText = `Ejecutado por: ${kickInfo.executor.tag} (${kickInfo.executor.id})`;
        const reasonText = kickInfo.reason ? `Motivo: \`${kickInfo.reason}\`` : 'Motivo: (no especificado)';

        const description =
          `👢 **Miembro expulsado del servidor (kick)**\n` +
          `Usuario: ${userTag}\n` +
          `${execText}\n` +
          `${reasonText}\n` +
          `Hora: <t:${nowTs}:F>`;

        await sendAdminEventLog(client, guildId, {
          title: 'Miembro expulsado (kick)',
          description
        });

        return;
      }

      // 3) Si no hay audit log relevante reciente → salida voluntaria
      const description =
        `🚪 **Miembro salió del servidor**\n` +
        `Usuario: ${userTag}\n` +
        `Motivo: salida voluntaria o no registrada en audit logs.\n` +
        `Hora: <t:${nowTs}:F>`;

      await sendAdminEventLog(client, guildId, {
        title: 'Miembro salió del servidor',
        description
      });
    } catch (err) {
      logger.error('Error en guildMemberRemove event:', err);
    }
  }
};

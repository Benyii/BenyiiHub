// src/events/guildMemberRemove.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorAndReason } = require('../utils/auditLogHelper');
const { getWelcomeBoostSettings } = require('../services/guildService');

const { generateGoodbyeImage } = require('../services/goodbyeImageService');
const { applyWelcomeTemplate } = require('../utils/welcomeTemplate');

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

      // ================================
      //  DESPEDIDA (imagen + mensaje)
      // ================================
      try {
        const settings = await getWelcomeBoostSettings(guildId);

        if (settings.goodbye_enabled && settings.goodbye_channel_id) {
          const channel = guild.channels.cache.get(settings.goodbye_channel_id);

          if (channel && channel.isTextBased()) {
            const shortName = settings.short_guild_name ?? guild.name;

            // Mensaje personalizado
            const template =
              settings.goodbye_custom_message ??
              'Adiós! {mention} se ha ido del servidor…';

            const content = applyWelcomeTemplate(template, {
              member,
              guild,
              shortName
            });

            // Imagen generada
            const img = await generateGoodbyeImage(member, shortName);

            await channel.send({
              content,
              files: img ? [img] : []
            });
          }
        }
      } catch (welcomeErr) {
        logger.error('Error enviando mensaje de despedida:', welcomeErr);
      }

      // ================================
      //      LOG ADMIN: BAN
      // ================================
      const banInfo = await getExecutorAndReason(
        guild,
        AuditLogEvent.MemberBanAdd,
        user.id,
        30000
      );

      if (banInfo.executor) {
        const execText = `Ejecutado por: ${banInfo.executor.tag} (${banInfo.executor.id})`;
        const reasonText = banInfo.reason
          ? `Motivo: \`${banInfo.reason}\``
          : 'Motivo: (no especificado)';

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

      // ================================
      //      LOG ADMIN: KICK
      // ================================
      const kickInfo = await getExecutorAndReason(
        guild,
        AuditLogEvent.MemberKick,
        user.id,
        30000
      );

      if (kickInfo.executor) {
        const execText = `Ejecutado por: ${kickInfo.executor.tag} (${kickInfo.executor.id})`;
        const reasonText = kickInfo.reason
          ? `Motivo: \`${kickInfo.reason}\``
          : 'Motivo: (no especificado)';

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

      // ================================
      //  LOG ADMIN: SALIDA VOLUNTARIA
      // ================================
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

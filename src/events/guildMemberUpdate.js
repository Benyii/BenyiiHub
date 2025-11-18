// src/events/guildMemberUpdate.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorLine, getExecutorAndReason } = require('../utils/auditLogHelper');
const { getWelcomeBoostSettings } = require('../services/guildService');
const { generateBoostImage } = require('../services/welcomeImageService');
const logger = require('../config/logger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    try {
      if (!newMember.guild) return;
      const guild = newMember.guild;
      const guildId = guild.id;

      const user = newMember.user;
      const userTag = `${user.tag} (${user.id})`;
      const nowTs = Math.floor(Date.now() / 1000);

      /* ──────────────────────────────── */
      /* 🔹 Detectar nuevo boost          */
      /* ──────────────────────────────── */
      const hadBoost = !!oldMember.premiumSince;
      const hasBoost = !!newMember.premiumSince;

      if (!hadBoost && hasBoost) {
        const settings = await getWelcomeBoostSettings(guildId);

        if (settings && settings.boost_enabled && settings.boost_channel_id) {
          const channel = guild.channels.cache.get(settings.boost_channel_id);

          if (channel && channel.isTextBased()) {
            const attachment = await generateBoostImage(newMember);
            const content = `💜 ¡${newMember} acaba de boostear el servidor!`;

            if (attachment) {
              await channel.send({
                content,
                files: [attachment]
              });
            } else {
              await channel.send({ content });
            }
          }
        }
      }

      /* ──────────────────────────────── */
      /* 🔹 Cambio de nickname            */
      /* ──────────────────────────────── */
      const oldNick = oldMember.nickname || oldMember.user.globalName || oldMember.user.username;
      const newNick = newMember.nickname || newMember.user.globalName || newMember.user.username;

      if (oldNick !== newNick) {
        const executorLine = await getExecutorLine(
          guild,
          AuditLogEvent.MemberUpdate,
          newMember.id
        );

        const description =
          `✏️ **Cambio de apodo**\n` +
          `Usuario: ${userTag}\n` +
          `Antes: \`${oldNick}\`\n` +
          `Después: \`${newNick}\`\n` +
          `${executorLine}\n` +
          `Hora: <t:${nowTs}:F>`;

        await sendAdminEventLog(client, guildId, {
          title: 'Cambio de apodo/nickname',
          description
        });
      }

      /* ──────────────────────────────── */
      /* 🔹 Cambio de roles               */
      /* ──────────────────────────────── */
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
      const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

      if (addedRoles.size || removedRoles.size) {
        const executorLine = await getExecutorLine(
          guild,
          AuditLogEvent.MemberRoleUpdate,
          newMember.id
        );

        let desc =
          `🎭 **Cambio de roles**\n` +
          `Usuario: ${userTag}\n` +
          `${executorLine}\n` +
          `Hora: <t:${nowTs}:F>\n\n`;

        if (addedRoles.size) {
          desc += `**Roles añadidos:**\n${addedRoles.map(r => `• ${r} (\`${r.id}\`)`).join('\n')}\n\n`;
        }
        if (removedRoles.size) {
          desc += `**Roles removidos:**\n${removedRoles.map(r => `• ${r.name} (\`${r.id}\`)`).join('\n')}\n`;
        }

        await sendAdminEventLog(client, guildId, {
          title: 'Cambio de roles de usuario',
          description: desc
        });
      }

      /* ──────────────────────────────── */
      /* 🔹 Timeouts (communicationDisabledUntil) */
      /* ──────────────────────────────── */
      const oldTimeoutTs = oldMember.communicationDisabledUntilTimestamp;
      const newTimeoutTs = newMember.communicationDisabledUntilTimestamp;

      if (oldTimeoutTs !== newTimeoutTs) {
        const { executor, reason } = await getExecutorAndReason(
          guild,
          AuditLogEvent.MemberUpdate,
          newMember.id,
          30000
        );

        const execText = executor
          ? `Ejecutado por: ${executor.tag} (${executor.id})`
          : 'Ejecutado por: (no disponible / audit log no encontrado)';
        const reasonText = reason ? `Motivo: \`${reason}\`` : 'Motivo: (no especificado)';

        if (!oldTimeoutTs && newTimeoutTs) {
          // Timeout aplicado
          const until = Math.floor(newTimeoutTs / 1000);
          const description =
            `⏱️ **Timeout aplicado a un usuario**\n` +
            `Usuario: ${userTag}\n` +
            `${execText}\n` +
            `${reasonText}\n` +
            `Timeout activo hasta: <t:${until}:F> (<t:${until}:R>)\n` +
            `Hora de acción: <t:${nowTs}:F>`;

          await sendAdminEventLog(client, guildId, {
            title: 'Usuario puesto en timeout',
            description
          });
        } else if (oldTimeoutTs && !newTimeoutTs) {
          // Timeout retirado
          const description =
            `✅ **Timeout retirado de un usuario**\n` +
            `Usuario: ${userTag}\n` +
            `${execText}\n` +
            `${reasonText}\n` +
            `Hora de acción: <t:${nowTs}:F>`;

          await sendAdminEventLog(client, guildId, {
            title: 'Timeout removido',
            description
          });
        } else if (oldTimeoutTs && newTimeoutTs) {
          // Timeout modificado
          const oldUntil = Math.floor(oldTimeoutTs / 1000);
          const newUntil = Math.floor(newTimeoutTs / 1000);

          const description =
            `⏱️ **Timeout actualizado**\n` +
            `Usuario: ${userTag}\n` +
            `${execText}\n` +
            `${reasonText}\n` +
            `Antes hasta: <t:${oldUntil}:F> (<t:${oldUntil}:R>)\n` +
            `Ahora hasta: <t:${newUntil}:F> (<t:${newUntil}:R>)\n` +
            `Hora de acción: <t:${nowTs}:F>`;

          await sendAdminEventLog(client, guildId, {
            title: 'Timeout actualizado',
            description
          });
        }
      }
    } catch (err) {
      logger.error('Error en guildMemberUpdate event:', err);
    }
  }
};

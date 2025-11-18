// src/events/voiceStateUpdate.js
const leaderboardService = require('../services/leaderboardService');
const voiceChannelService = require('../services/voiceChannelService');
const { sendUserEventLog } = require('../services/userEventLogService');
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorAndReason } = require('../utils/auditLogHelper');
const { getUserLogFlags } = require('../services/guildService');
const logger = require('../config/logger');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const guildId = guild.id;
    const userId = oldState.id || newState.id;
    const member = newState.member || oldState.member;
    const userTag = member?.user ? `${member.user.tag} (${member.user.id})` : userId;
    const nowTs = Math.floor(Date.now() / 1000);

    const joinedVoice = !oldState.channelId && newState.channelId;
    const leftVoice = oldState.channelId && !newState.channelId;
    const movedVoice =
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId;

    // -------- Leaderboard + canales dinámicos --------
    if (guildId && userId) {
      try {
        if (joinedVoice) {
          await leaderboardService.registerVoiceJoin(guildId, userId);
        } else if (leftVoice) {
          await leaderboardService.registerVoiceLeave(guildId, userId);
        }
      } catch (err) {
        logger.error('Error actualizando leaderboard en voiceStateUpdate:', err);
      }
    }

    try {
      await voiceChannelService.createUserChannelIfNeeded(oldState, newState);
      await voiceChannelService.deleteUserChannelIfEmpty(oldState, newState);
    } catch (err) {
      logger.error('Error en voiceChannelService dentro de voiceStateUpdate:', err);
    }

    // -------- Logs de usuario (nivel user logs) --------
    try {
      const flags = await getUserLogFlags(guildId);
      if (flags.voice) {
        if (joinedVoice && newState.channel) {
          const ch = newState.channel;

          const description =
            `🔊 **Usuario se conectó a voz**\n` +
            `Usuario: ${userTag}\n` +
            `Canal: \`${ch.name}\` (${ch.id})\n` +
            `Hora: <t:${nowTs}:F>`;

          await sendUserEventLog(client, guildId, {
            title: 'Conexión a canal de voz',
            description
          });
        } else if (leftVoice && oldState.channel) {
          const ch = oldState.channel;

          const description =
            `🔇 **Usuario se desconectó de voz**\n` +
            `Usuario: ${userTag}\n` +
            `Canal: \`${ch.name}\` (${ch.id})\n` +
            `Hora: <t:${nowTs}:F>`;

          await sendUserEventLog(client, guildId, {
            title: 'Desconexión de canal de voz',
            description
          });
        } else if (movedVoice && oldState.channel && newState.channel) {
          const chFrom = oldState.channel;
          const chTo = newState.channel;

          const description =
            `🔁 **Usuario cambió de canal de voz**\n` +
            `Usuario: ${userTag}\n` +
            `De: \`${chFrom.name}\` (${chFrom.id})\n` +
            `A: \`${chTo.name}\` (${chTo.id})\n` +
            `Hora: <t:${nowTs}:F>`;

          await sendUserEventLog(client, guildId, {
            title: 'Cambio de canal de voz',
            description
          });
        }
      }
    } catch (err) {
      logger.error('Error enviando userEventLog en voiceStateUpdate:', err);
    }

    // -------- Logs administrativos (kick / move forzado) --------
    try {
      // Kick de voz (desconectado forzadamente)
      if (leftVoice && oldState.channel) {
        const { executor, reason } = await getExecutorAndReason(
          guild,
          AuditLogEvent.MemberDisconnect,
          userId,
          15000
        );

        if (executor) {
          const ch = oldState.channel;
          const execText = `Ejecutado por: ${executor.tag} (${executor.id})`;
          const reasonText = reason ? `Motivo: \`${reason}\`` : 'Motivo: (no especificado)';

          const description =
            `👢 **Usuario expulsado de un canal de voz**\n` +
            `Usuario: ${userTag}\n` +
            `Canal: \`${ch.name}\` (${ch.id})\n` +
            `${execText}\n` +
            `${reasonText}\n` +
            `Hora: <t:${nowTs}:F>`;

          await sendAdminEventLog(client, guildId, {
            title: 'Usuario expulsado de voz',
            description
          });
        }
      }

      // Move forzado de un canal a otro
      if (movedVoice && oldState.channel && newState.channel) {
        const { executor, reason } = await getExecutorAndReason(
          guild,
          AuditLogEvent.MemberMove,
          userId,
          15000
        );

        if (executor) {
          const chFrom = oldState.channel;
          const chTo = newState.channel;
          const execText = `Ejecutado por: ${executor.tag} (${executor.id})`;
          const reasonText = reason ? `Motivo: \`${reason}\`` : 'Motivo: (no especificado)';

          const description =
            `🚚 **Usuario movido entre canales de voz por un admin**\n` +
            `Usuario: ${userTag}\n` +
            `De: \`${chFrom.name}\` (${chFrom.id})\n` +
            `A: \`${chTo.name}\` (${chTo.id})\n` +
            `${execText}\n` +
            `${reasonText}\n` +
            `Hora: <t:${nowTs}:F>`;

          await sendAdminEventLog(client, guildId, {
            title: 'Usuario movido de canal de voz',
            description
          });
        }
      }
    } catch (err) {
      logger.error('Error enviando adminEventLog en voiceStateUpdate:', err);
    }
  }
};

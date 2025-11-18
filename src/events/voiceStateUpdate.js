// src/events/voiceStateUpdate.js
const leaderboardService = require('../services/leaderboardService');
const voiceChannelService = require('../services/voiceChannelService');
const { sendUserEventLog } = require('../services/userEventLogService');
const logger = require('../config/logger');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const guildId = guild.id;
    const userId = oldState.id || newState.id;
    const member = newState.member || oldState.member;

    const joinedVoice = !oldState.channelId && newState.channelId;
    const leftVoice = oldState.channelId && !newState.channelId;

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

    // Logs de eventos de usuario (voz) – siempre INFO/azul
    try {
      if (joinedVoice && newState.channel) {
        const ch = newState.channel;
        const userTag = member?.user?.tag || userId;

        const description =
          `🔊 **Usuario se conectó a voz**\n` +
          `Usuario: ${userTag} (${userId})\n` +
          `Canal: \`${ch.name}\` (${ch.id})\n` +
          `Hora: <t:${Math.floor(Date.now() / 1000)}:F>`;

        await sendUserEventLog(client, guildId, {
          title: 'Conexión a canal de voz',
          description
        });
      } else if (leftVoice && oldState.channel) {
        const ch = oldState.channel;
        const userTag = member?.user?.tag || userId;

        const description =
          `🔇 **Usuario se desconectó de voz**\n` +
          `Usuario: ${userTag} (${userId})\n` +
          `Canal: \`${ch.name}\` (${ch.id})\n` +
          `Hora: <t:${Math.floor(Date.now() / 1000)}:F>`;

        await sendUserEventLog(client, guildId, {
          title: 'Desconexión de canal de voz',
          description
        });
      }
    } catch (err) {
      logger.error('Error enviando userEventLog en voiceStateUpdate:', err);
    }
  }
};

// src/events/voiceStateUpdate.js
const leaderboardService = require('../services/leaderboardService');
const voiceChannelService = require('../services/voiceChannelService');
const { sendUserEventLog } = require('../services/userEventLogService');
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorAndReason } = require('../utils/auditLogHelper');
const { getUserLogFlags } = require('../services/guildService');
const {
  isVoiceChannelBlacklisted
} = require('../services/voiceBlacklistService');
const logger = require('../config/logger');

// servicio de canales dinámicos
const {
  getDynamicConfigByCreatorChannel,
  getInstanceByChannel,
  createDynamicInstance,
  deleteInstanceByChannel
} = require('../services/dynamicVoiceService');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const guildId = guild.id;
    const userId = oldState.id || newState.id;
    const member = newState.member || oldState.member;

    const userTag = member?.user ? `${member.user.tag} (${member.user.id})` : userId;
    const displayName =
      member?.displayName || member?.user?.username || userId;

    const nowTs = Math.floor(Date.now() / 1000);

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    const joinedVoice = !oldChannelId && newChannelId;
    const leftVoice = oldChannelId && !newChannelId;
    const movedVoice =
      oldChannelId &&
      newChannelId &&
      oldChannelId !== newChannelId;

    /* =======================================================
     *  CANALES DE VOZ DINÁMICOS (sistema nuevo en DB)
     * =====================================================*/

    // 1) CREAR canal dinámico al entrar al canal "creador"
    try {
      if (newChannelId && newChannelId !== oldChannelId) {
        const config = await getDynamicConfigByCreatorChannel(guildId, newChannelId);

        if (config && config.creator_channel_id === newChannelId) {
          const baseName = config.base_name || 'Sala';
          const targetCategoryId =
            config.target_category_id || config.source_category_id;

          const targetCategory = guild.channels.cache.get(targetCategoryId);

          if (!targetCategory) {
            logger.warn(
              `Categoria destino no encontrada para config #${config.id} en guild ${guild.id}`
            );
          } else {
            const channelName = `${baseName} - ${displayName}`;
            const userLimit = config.dynamic_user_limit || 0;

            const createdChannel = await guild.channels.create({
              name: channelName,
              type: newState.channel?.type ?? 2, // 2 = voz
              parent: targetCategory.id,
              userLimit
            });

            // Registrar instancia en la tabla de instancias
            await createDynamicInstance(guildId, config.id, createdChannel.id);

            // Mover al usuario al canal nuevo
            if (member?.voice) {
              await member.voice.setChannel(createdChannel);
            }
          }
        }
      }
    } catch (err) {
      logger.error('Error en sistema de canales dinámicos (creación):', err);
    }

    // 2) BORRAR canal dinámico cuando se queda vacío
    try {
      if (oldChannelId && oldChannelId !== newChannelId) {
        const instance = await getInstanceByChannel(guildId, oldChannelId);
        if (instance) {
          const oldChannel = guild.channels.cache.get(oldChannelId);

          // Si el canal ya no existe, limpiamos solo la DB
          if (!oldChannel) {
            await deleteInstanceByChannel(guildId, oldChannelId);
          } else if (oldChannel.members.size === 0) {
            // Canal dinámico sin usuarios -> eliminar
            await oldChannel.delete('Canal dinámico vacío (auto-delete)');
            await deleteInstanceByChannel(guildId, oldChannelId);
          }
        }
      }
    } catch (err) {
      logger.error('Error en sistema de canales dinámicos (borrado):', err);
    }

    /* =======================================================
     *  Leaderboard (tiempo en voz / sesiones) con blacklist
     * =====================================================*/
    if (guildId && userId) {
      try {
        let skip = false;

        // Si entra a voz, revisamos el canal nuevo
        if (joinedVoice && newChannelId) {
          const blacklisted = await isVoiceChannelBlacklisted(guildId, newChannelId);
          if (blacklisted) {
            skip = true;
          }
        }

        // Si sale de voz, revisamos el canal de donde viene
        if (leftVoice && oldChannelId && !skip) {
          const blacklisted = await isVoiceChannelBlacklisted(guildId, oldChannelId);
          if (blacklisted) {
            skip = true;
          }
        }

        if (!skip) {
          if (joinedVoice) {
            await leaderboardService.registerVoiceJoin(guildId, userId);
          } else if (leftVoice) {
            await leaderboardService.registerVoiceLeave(guildId, userId);
          }
        }
      } catch (err) {
        logger.error('Error actualizando leaderboard en voiceStateUpdate:', err);
      }
    }

    /* =======================================================
     *  Sistema antiguo de voiceChannelService (si lo sigues usando)
     * =====================================================*/
    try {
      await voiceChannelService.createUserChannelIfNeeded(oldState, newState);
      await voiceChannelService.deleteUserChannelIfEmpty(oldState, newState);
    } catch (err) {
      logger.error('Error en voiceChannelService dentro de voiceStateUpdate:', err);
    }

    /* =======================================================
     *  Logs de usuario (nivel user logs)
     * =====================================================*/
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

    /* =======================================================
     *  Logs administrativos (kick / move forzado)
     * =====================================================*/
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

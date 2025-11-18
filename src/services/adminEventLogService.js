// src/services/adminEventLogService.js
const {
  getAdminEventLogChannel,
  getAdminLogFlag,
  getGuildLogChannel
} = require('./guildService');
const { buildLogEmbed } = require('../utils/embedLogger');
const logger = require('../config/logger');

// Para no spamear avisos de "no hay canal admin" por cada evento
const missingAdminChannelNotified = new Set();

/**
 * Envía un embed de log administrativo al canal configurado del guild.
 * Usa color INFO (azul) por defecto.
 *
 * Si NO hay canal de admin logs configurado:
 *  - Envía una sola vez por guild un aviso al canal de logs principal (log_channel_id).
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 */
async function sendAdminEventLog(client, guildId, { title, description }) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const adminEnabled = await getAdminLogFlag(guildId);
  if (!adminEnabled) return;

  const adminChannelId = await getAdminEventLogChannel(guildId);

  // ✅ Caso normal: hay canal de admin logs
  if (adminChannelId) {
    const channel = guild.channels.cache.get(adminChannelId);
    if (!channel) {
      logger.warn(`Canal de admin event logs ${adminChannelId} no encontrado en guild ${guildId}`);
      return;
    }

    const embed = buildLogEmbed(client, {
      level: 'info',
      title,
      description
    });

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`Error enviando admin event log al guild ${guildId}:`, err);
    }

    return;
  }

  // ❗ No hay canal de admin logs configurado
  // Avisar SOLO una vez por guild en esta sesión
  if (missingAdminChannelNotified.has(guildId)) {
    return;
  }

  missingAdminChannelNotified.add(guildId);

  // Intentar enviar el aviso al canal de logs principal
  const mainLogChannelId = await getGuildLogChannel(guildId);
  if (!mainLogChannelId) {
    logger.warn(
      `No hay admin_event_log_channel NI log_channel configurado para guild ${guildId}. ` +
      'No se puede avisar sobre la falta de canal de logs admin.'
    );
    return;
  }

  const mainChannel = guild.channels.cache.get(mainLogChannelId);
  if (!mainChannel) {
    logger.warn(
      `log_channel_id ${mainLogChannelId} no encontrado en cache para guild ${guildId}. ` +
      'No se pudo enviar aviso de falta de canal de logs admin.'
    );
    return;
  }

  const warnEmbed = buildLogEmbed(client, {
    level: 'warn',
    title: 'Canal de logs administrativos no configurado',
    description:
      'Se intentó registrar un evento administrativo, pero este servidor **no tiene configurado** un canal de logs administrativos.\n\n' +
      'Por favor, usa el comando `/setadminlogchannel` para establecer un canal donde se registren estos eventos.'
  });

  try {
    await mainChannel.send({ embeds: [warnEmbed] });
  } catch (err) {
    logger.error(
      `Error enviando aviso de falta de canal admin logs al log_channel ${mainLogChannelId} en guild ${guildId}:`,
      err
    );
  }
}

module.exports = {
  sendAdminEventLog
};

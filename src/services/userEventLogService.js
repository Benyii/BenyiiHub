// src/services/userEventLogService.js
const { getUserEventLogChannel } = require('./guildService');
const { buildLogEmbed } = require('../utils/embedLogger');
const logger = require('../config/logger');

/**
 * Envía un embed de log de evento de usuario al canal configurado para ese guild.
 * Siempre se envía como nivel INFO (color azul).
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {string} [options.imageUrl]  URL de una imagen para mostrar en el embed (opcional)
 */
async function sendUserEventLog(client, guildId, { title, description, imageUrl = null }) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channelId = await getUserEventLogChannel(guildId);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    logger.warn(`Canal de user event logs ${channelId} no encontrado en guild ${guildId}`);
    return;
  }

  const embed = buildLogEmbed(client, {
    level: 'info', // siempre INFO
    title,
    description
  });

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`Error enviando user event log al guild ${guildId}:`, err);
  }
}

module.exports = {
  sendUserEventLog
};

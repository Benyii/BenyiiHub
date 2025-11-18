// src/services/logChannelService.js
const { getAllGuildLogChannels } = require('./guildService');
const logger = require('../config/logger');

/**
 * Envía un mensaje a TODOS los canales de logs configurados.
 *
 * @param {import('discord.js').Client} client
 * @param {string} message
 */
async function sendLogToAllGuilds(client, message) {
  const guildLogRows = await getAllGuildLogChannels();

  for (const row of guildLogRows) {
    const guild = client.guilds.cache.get(row.id);
    if (!guild) continue;

    const channel = guild.channels.cache.get(row.log_channel_id);
    if (!channel) {
      logger.warn(`Canal de logs ${row.log_channel_id} no encontrado en guild ${row.id}`);
      continue;
    }

    try {
      await channel.send(message);
    } catch (err) {
      logger.error(`Error enviando log al canal ${row.log_channel_id} del guild ${row.id}:`, err);
    }
  }
}

/**
 * Envía un mensaje solo al canal de logs de un guild específico.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} message
 */
async function sendLogToGuild(client, guildId, message) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const guildLogRows = await getAllGuildLogChannels();
  const row = guildLogRows.find(r => r.id === guildId);
  if (!row) return;

  const channel = guild.channels.cache.get(row.log_channel_id);
  if (!channel) return;

  try {
    await channel.send(message);
  } catch (err) {
    logger.error(`Error enviando log al guild ${guildId}:`, err);
  }
}

module.exports = {
  sendLogToAllGuilds,
  sendLogToGuild
};

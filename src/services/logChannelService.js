// src/services/logChannelService.js
const { getAllGuildLogChannels } = require('./guildService');
const { buildLogEmbed, buildErrorEmbed } = require('../utils/embedLogger');
const logger = require('../config/logger');

/**
 * Envía un log embed a TODOS los canales de logs configurados.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} options
 * @param {'info'|'warning'|'error'|'success'} options.level
 * @param {string} options.title
 * @param {string} options.description
 */
async function sendLogToAllGuilds(client, { level, title, description }) {
  const guildLogRows = await getAllGuildLogChannels();
  const embed = buildLogEmbed(client, { level, title, description });

  for (const row of guildLogRows) {
    const guild = client.guilds.cache.get(row.id);
    if (!guild) continue;

    const channel = guild.channels.cache.get(row.log_channel_id);
    if (!channel) {
      logger.warn(`Canal de logs ${row.log_channel_id} no encontrado en guild ${row.id}`);
      continue;
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`Error enviando log al canal ${row.log_channel_id} del guild ${row.id}:`, err);
    }
  }
}

/**
 * Envía un log embed solo al canal de logs de un guild específico.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {Object} options
 * @param {'info'|'warning'|'error'|'success'} options.level
 * @param {string} options.title
 * @param {string} options.description
 */
async function sendLogToGuild(client, guildId, { level, title, description }) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const guildLogRows = await getAllGuildLogChannels();
  const row = guildLogRows.find(r => r.id === guildId);
  if (!row) return;

  const channel = guild.channels.cache.get(row.log_channel_id);
  if (!channel) {
    logger.warn(`Canal de logs ${row.log_channel_id} no encontrado en guild ${guildId}`);
    return;
  }

  const embed = buildLogEmbed(client, { level, title, description });

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`Error enviando log al guild ${guildId}:`, err);
  }
}

/**
 * Envía un log de ERROR con embed especializado a TODOS los guilds.
 *
 * @param {import('discord.js').Client} client
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {Error|string} options.error
 */
async function sendErrorLogToAllGuilds(client, { title, description, error }) {
  const guildLogRows = await getAllGuildLogChannels();
  const embed = buildErrorEmbed(client, { title, description, error });

  for (const row of guildLogRows) {
    const guild = client.guilds.cache.get(row.id);
    if (!guild) continue;

    const channel = guild.channels.cache.get(row.log_channel_id);
    if (!channel) continue;

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error(`Error enviando error-log al canal ${row.log_channel_id} del guild ${row.id}:`, err);
    }
  }
}

/**
 * Envía un log de ERROR con embed especializado a un guild concreto.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {Error|string} options.error
 */
async function sendErrorLogToGuild(client, guildId, { title, description, error }) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const guildLogRows = await getAllGuildLogChannels();
  const row = guildLogRows.find(r => r.id === guildId);
  if (!row) return;

  const channel = guild.channels.cache.get(row.log_channel_id);
  if (!channel) return;

  const embed = buildErrorEmbed(client, { title, description, error });

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    logger.error(`Error enviando error-log al guild ${guildId}:`, err);
  }
}

module.exports = {
  sendLogToAllGuilds,
  sendLogToGuild,
  sendErrorLogToAllGuilds,
  sendErrorLogToGuild
};

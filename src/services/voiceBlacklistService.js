// src/services/voiceBlacklistService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Marca un canal de voz como "blacklist" para el sistema de actividad.
 * No se contabilizará tiempo ni sesiones en estos canales.
 */
async function addBlacklistedChannel(guildId, channelId) {
  const sql = `
    INSERT INTO voice_blacklist_channels (guild_id, channel_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      channel_id = VALUES(channel_id)
  `;

  try {
    await pool.execute(sql, [guildId, channelId]);
    return true;
  } catch (err) {
    logger.error('Error addBlacklistedChannel:', err);
    throw err;
  }
}

/**
 * Elimina un canal de la blacklist.
 */
async function removeBlacklistedChannel(guildId, channelId) {
  const sql = `
    DELETE FROM voice_blacklist_channels
    WHERE guild_id = ? AND channel_id = ?
  `;

  try {
    await pool.execute(sql, [guildId, channelId]);
    return true;
  } catch (err) {
    logger.error('Error removeBlacklistedChannel:', err);
    throw err;
  }
}

/**
 * Devuelve true si el canal está en la blacklist de ese guild.
 */
async function isVoiceChannelBlacklisted(guildId, channelId) {
  const sql = `
    SELECT 1
    FROM voice_blacklist_channels
    WHERE guild_id = ? AND channel_id = ?
    LIMIT 1
  `;

  try {
    const [rows] = await pool.execute(sql, [guildId, channelId]);
    return rows.length > 0;
  } catch (err) {
    logger.error('Error isVoiceChannelBlacklisted:', err);
    // En caso de error devolvemos false para no romper el flujo
    return false;
  }
}

/**
 * Lista los canales de voz en blacklist para un guild.
 */
async function getBlacklistedChannels(guildId) {
  const sql = `
    SELECT channel_id
    FROM voice_blacklist_channels
    WHERE guild_id = ?
    ORDER BY channel_id ASC
  `;

  try {
    const [rows] = await pool.execute(sql, [guildId]);
    return rows;
  } catch (err) {
    logger.error('Error getBlacklistedChannels:', err);
    return [];
  }
}

module.exports = {
  addBlacklistedChannel,
  removeBlacklistedChannel,
  isVoiceChannelBlacklisted,
  getBlacklistedChannels
};

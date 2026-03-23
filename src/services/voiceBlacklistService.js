// src/services/voiceBlacklistService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/* ───────────────────────────────────────── */
/*  Caché en memoria de blacklist por guild  */
/* ───────────────────────────────────────── */

const blacklistCache = new Map(); // guildId → { channels: Set<channelId>, expiry }
const BLACKLIST_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

/**
 * Carga y cachea todos los canales en blacklist de un guild.
 */
async function loadBlacklistForGuild(guildId) {
  const [rows] = await pool.execute(
    'SELECT channel_id FROM voice_blacklist_channels WHERE guild_id = ?',
    [guildId]
  );
  const channels = new Set(rows.map(r => r.channel_id));
  blacklistCache.set(guildId, { channels, expiry: Date.now() + BLACKLIST_CACHE_TTL });
  return channels;
}

function invalidateBlacklistCache(guildId) {
  blacklistCache.delete(guildId);
}

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
    invalidateBlacklistCache(guildId);
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
    invalidateBlacklistCache(guildId);
    return true;
  } catch (err) {
    logger.error('Error removeBlacklistedChannel:', err);
    throw err;
  }
}

/**
 * Devuelve true si el canal está en la blacklist de ese guild.
 * Usa caché en memoria para evitar queries en cada evento de voz.
 */
async function isVoiceChannelBlacklisted(guildId, channelId) {
  try {
    const cached = blacklistCache.get(guildId);
    if (cached && Date.now() < cached.expiry) {
      return cached.channels.has(channelId);
    }
    const channels = await loadBlacklistForGuild(guildId);
    return channels.has(channelId);
  } catch (err) {
    logger.error('Error isVoiceChannelBlacklisted:', err);
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

// src/services/twitchTrackerService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Agrega o actualiza un canal de Twitch a trackear para un guild.
 * twitchLogin va siempre en minúsculas.
 */
async function upsertTwitchStreamer(guildId, twitchLogin) {
  const login = twitchLogin.toLowerCase();

  const sql = `
    INSERT INTO twitch_streamers (guild_id, twitch_login)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      updated_at = CURRENT_TIMESTAMP;
  `;

  try {
    await pool.execute(sql, [guildId, login]);
    logger.info(`Twitch streamer añadido/actualizado: ${guildId} - ${login}`);
  } catch (err) {
    logger.error('Error en upsertTwitchStreamer:', err);
    throw err;
  }
}

/**
 * Elimina un canal de Twitch para un guild.
 */
async function removeTwitchStreamer(guildId, twitchLogin) {
  const login = twitchLogin.toLowerCase();
  try {
    await pool.execute(
      'DELETE FROM twitch_streamers WHERE guild_id = ? AND twitch_login = ?',
      [guildId, login]
    );
    logger.info(`Twitch streamer eliminado: ${guildId} - ${login}`);
  } catch (err) {
    logger.error('Error en removeTwitchStreamer:', err);
    throw err;
  }
}

/**
 * Lista streamers configurados en un guild.
 */
async function listTwitchStreamersByGuild(guildId) {
  try {
    const [rows] = await pool.execute(
      'SELECT twitch_login, is_live, last_stream_id FROM twitch_streamers WHERE guild_id = ? ORDER BY twitch_login',
      [guildId]
    );
    return rows;
  } catch (err) {
    logger.error('Error en listTwitchStreamersByGuild:', err);
    return [];
  }
}

/**
 * Obtiene TODOS los streamers de todos los guilds (para el watcher).
 */
async function getAllTrackedStreamers() {
  try {
    const [rows] = await pool.execute(
      'SELECT id, guild_id, twitch_login, twitch_user_id, twitch_display_name, last_stream_id, is_live FROM twitch_streamers'
    );
    return rows;
  } catch (err) {
    logger.error('Error en getAllTrackedStreamers:', err);
    return [];
  }
}

/**
 * Actualiza el estado de un streamer (al pasar de offline→online o viceversa).
 */
async function updateStreamerLiveState(rowId, {
  isLive,
  streamId = null,
  displayName = null,
  userId = null
}) {
  const sql = `
    UPDATE twitch_streamers
    SET
      is_live = ?,
      last_stream_id = ?,
      twitch_display_name = COALESCE(?, twitch_display_name),
      twitch_user_id = COALESCE(?, twitch_user_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  try {
    await pool.execute(sql, [
      isLive ? 1 : 0,
      streamId,
      displayName,
      userId,
      rowId
    ]);
  } catch (err) {
    logger.error('Error en updateStreamerLiveState:', err);
  }
}

module.exports = {
  upsertTwitchStreamer,
  removeTwitchStreamer,
  listTwitchStreamersByGuild,
  getAllTrackedStreamers,
  updateStreamerLiveState
};

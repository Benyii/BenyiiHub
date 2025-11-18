// src/services/leaderboardService.js
const pool = require('../config/database');
const logger = require('../config/logger');

// Importamos funciones del nuevo statsService
const {
  recalculateXpAndLevel,
  getLeaderboardStats
} = require('./statsService');

/**
 * Asegura el registro del usuario en la tabla user_stats y suma +1 mensaje.
 * Luego recalcula XP y nivel.
 */
async function incrementMessageCount(guildId, userId) {
  const sql = `
    INSERT INTO user_stats (guild_id, user_id, messages_count, voice_seconds, voice_sessions, last_join_voice_at)
    VALUES (?, ?, 1, 0, 0, NULL)
    ON DUPLICATE KEY UPDATE messages_count = messages_count + 1;
  `;
  try {
    await pool.execute(sql, [guildId, userId]);

    // Recalcular XP y nivel con la nueva lógica
    await recalculateXpAndLevel(guildId, userId);
  } catch (err) {
    logger.error('Error incrementMessageCount:', err);
  }
}

/**
 * Registra el ingreso a voz y aumenta el contador de sesiones.
 * Luego recalcula XP y nivel.
 */
async function registerVoiceJoin(guildId, userId) {
  const sql = `
    INSERT INTO user_stats (guild_id, user_id, messages_count, voice_seconds, voice_sessions, last_join_voice_at)
    VALUES (?, ?, 0, 0, 1, NOW())
    ON DUPLICATE KEY UPDATE
      voice_sessions = voice_sessions + 1,
      last_join_voice_at = NOW();
  `;
  try {
    await pool.execute(sql, [guildId, userId]);

    // Recalcular XP y nivel
    await recalculateXpAndLevel(guildId, userId);
  } catch (err) {
    logger.error('Error registerVoiceJoin:', err);
  }
}

/**
 * Registra la salida de voz, sumando los segundos a voice_seconds.
 * Luego recalcula XP y nivel.
 */
async function registerVoiceLeave(guildId, userId) {
  const sql = `
    UPDATE user_stats
    SET
      voice_seconds = voice_seconds + TIMESTAMPDIFF(SECOND, last_join_voice_at, NOW()),
      last_join_voice_at = NULL
    WHERE guild_id = ? AND user_id = ? AND last_join_voice_at IS NOT NULL;
  `;
  try {
    await pool.execute(sql, [guildId, userId]);

    // Recalcular XP y nivel
    await recalculateXpAndLevel(guildId, userId);
  } catch (err) {
    logger.error('Error registerVoiceLeave:', err);
  }
}

/**
 * Devuelve el top de usuarios usando la lógica de statsService:
 * - Incluye xp, lvl, joined_at y days_in_guild
 * - Ordenado por xp DESC
 */
async function getTopUsers(guildId, limit = 10) {
  try {
    const rows = await getLeaderboardStats(guildId, limit);
    return rows;
  } catch (err) {
    logger.error('Error getTopUsers:', err);
    return [];
  }
}

module.exports = {
  incrementMessageCount,
  registerVoiceJoin,
  registerVoiceLeave,
  getTopUsers
};

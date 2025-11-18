const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Asegura el registro del usuario en la tabla user_stats y suma +1 mensaje.
 */
async function incrementMessageCount(guildId, userId) {
  const sql = `
    INSERT INTO user_stats (guild_id, user_id, messages_count, voice_seconds, voice_sessions, last_join_voice_at)
    VALUES (?, ?, 1, 0, 0, NULL)
    ON DUPLICATE KEY UPDATE messages_count = messages_count + 1;
  `;
  try {
    await pool.execute(sql, [guildId, userId]);
  } catch (err) {
    logger.error('Error incrementMessageCount:', err);
  }
}

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
  } catch (err) {
    logger.error('Error registerVoiceJoin:', err);
  }
}

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
  } catch (err) {
    logger.error('Error registerVoiceLeave:', err);
  }
}

async function getTopUsers(guildId, limit = 10) {
  const sql = `
    SELECT
      user_id,
      messages_count,
      voice_seconds,
      voice_sessions,
      (messages_count + voice_seconds / 60 + voice_sessions * 5) AS score
    FROM user_stats
    WHERE guild_id = ?
    ORDER BY score DESC
    LIMIT ?;
  `;
  try {
    const [rows] = await pool.execute(sql, [guildId, limit]);
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

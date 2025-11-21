// src/services/statsService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Devuelve la fila de stats del usuario o la crea si no existe.
 */
async function ensureUserStats(guildId, userId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    if (rows.length) return rows[0];

    await pool.execute(
      `INSERT INTO user_stats (
         guild_id,
         user_id,
         messages_count,
         voice_seconds,
         voice_sessions,
         last_join_voice_at,
         joined_at,
         xp,
         lvl
       )
       VALUES (?, ?, 0, 0, 0, NULL, NULL, 0, 1)`,
      [guildId, userId]
    );

    const [rows2] = await pool.execute(
      'SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    return rows2[0];
  } catch (err) {
    logger.error('Error en ensureUserStats:', err);
    return null;
  }
}

/**
 * Guarda la fecha de ingreso si aún no está seteada.
 */
async function setJoinedAtIfEmpty(guildId, userId, joinedAt) {
  try {
    await pool.execute(
      `UPDATE user_stats
       SET joined_at = COALESCE(joined_at, ?)
       WHERE guild_id = ? AND user_id = ?`,
      [joinedAt, guildId, userId]
    );
  } catch (err) {
    logger.error('Error en setJoinedAtIfEmpty:', err);
  }
}

/**
 * Calcula el XP a partir de los stats actuales.
 * Ajusta la fórmula si quieres otros pesos.
 */
function calculateXpFromStats(stats) {
  const messages = stats.messages_count || 0;
  const voiceSeconds = stats.voice_seconds || 0;

  // Ejemplo de fórmula:
  // 5 XP por mensaje, 1 XP por minuto en voz
  const xpFromMessages = messages * 5;
  const xpFromVoice = Math.floor(voiceSeconds / 60) * 1;

  return xpFromMessages + xpFromVoice;
}

/**
 * A partir del XP, calcula el nivel.
 * Ejemplo: 100 XP por nivel.
 */
function calculateLevelFromXp(xp) {
  const xpPerLevel = 100;
  return Math.max(1, Math.floor(xp / xpPerLevel) + 1);
}

/**
 * Recalcula XP y nivel de un usuario en base a sus stats
 * y guarda el resultado en la tabla.
 */
async function recalculateXpAndLevel(guildId, userId, client = null) {
  try {
    // 1) Leemos stats actuales
    const [rows] = await pool.execute(
      'SELECT messages_count, voice_seconds, xp, lvl FROM user_stats WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );

    if (!rows.length) {
      return { oldLevel: 1, newLevel: 1 };
    }

    const current = rows[0];
    const oldLevel = current.lvl;
    const oldXp = current.xp;

    // 2) Calculamos XP a partir de stats
    const newXp = calculateXpFromStats({
      messages_count: current.messages_count,
      voice_seconds: current.voice_seconds
    });

    const newLevel = calculateLevelFromXp(newXp);

    // 3) Guardamos si cambió
    if (newXp !== oldXp || newLevel !== oldLevel) {
      await pool.execute(
        'UPDATE user_stats SET xp = ?, lvl = ? WHERE guild_id = ? AND user_id = ?',
        [newXp, newLevel, guildId, userId]
      );
    }

    // 4) Si subió de nivel y tenemos client → anunciamos
    if (client && newLevel > oldLevel) {
      await announceLevelUp(client, guildId, userId, newLevel);
    }

    return { oldLevel, newLevel };
  } catch (err) {
    logger.error('Error en recalculateXpAndLevel:', err);
    return { oldLevel: null, newLevel: null };
  }
}

/**
 * Devuelve stats listos para leaderboard,
 * incluyendo días en el servidor.
 */
async function getLeaderboardStats(guildId, limit = 10) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         guild_id,
         user_id,
         messages_count,
         voice_seconds,
         voice_sessions,
         last_join_voice_at,
         joined_at,
         xp,
         lvl,
         CASE
           WHEN joined_at IS NULL THEN NULL
           ELSE TIMESTAMPDIFF(DAY, joined_at, NOW())
         END AS days_in_guild
       FROM user_stats
       WHERE guild_id = ?
       ORDER BY xp DESC
       LIMIT ?`,
      [guildId, limit]
    );

    return rows;
  } catch (err) {
    logger.error('Error en getLeaderboardStats:', err);
    return [];
  }
}

// ...resto de imports y funciones que ya tienes arriba...

/**
 * Devuelve los datos de rank de un usuario:
 * - xp, lvl
 * - posición (rank) dentro del servidor
 * - días en el servidor
 */
async function getUserRankData(guildId, userId) {
  try {
    // Nos aseguramos de que tenga stats y XP/level recalculados
    await ensureUserStats(guildId, userId);
    const updated = await recalculateXpAndLevel(guildId, userId);

    let statsRow = updated;
    if (!statsRow) {
      const [rows] = await pool.execute(
        'SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
      );
      if (!rows.length) return null;
      statsRow = rows[0];
    }

    const xp = statsRow.xp || 0;
    const lvl = statsRow.lvl || 1;

    // Rank: cuántos tienen más XP + 1
    const [rankRows] = await pool.execute(
      'SELECT COUNT(*) + 1 AS rank FROM user_stats WHERE guild_id = ? AND xp > ?',
      [guildId, xp]
    );
    const rank = rankRows[0]?.rank ?? 1;

    // Días en el servidor
    const [daysRows] = await pool.execute(
      `SELECT
         joined_at,
         CASE
           WHEN joined_at IS NULL THEN NULL
           ELSE TIMESTAMPDIFF(DAY, joined_at, NOW())
         END AS days_in_guild
       FROM user_stats
       WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId]
    );

    const joined_at = daysRows[0]?.joined_at ?? null;
    const days_in_guild = daysRows[0]?.days_in_guild ?? null;

    return {
      xp,
      lvl,
      rank,
      joined_at,
      days_in_guild
    };
  } catch (err) {
    logger.error('Error en getUserRankData:', err);
    return null;
  }
}

module.exports = {
  ensureUserStats,
  setJoinedAtIfEmpty,
  recalculateXpAndLevel,
  getLeaderboardStats,
  calculateXpFromStats,
  calculateLevelFromXp,
  getUserRankData
};

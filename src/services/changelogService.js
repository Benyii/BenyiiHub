// src/services/changelogService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Guarda/actualiza el canal de changelog para un servidor.
 */
async function setChangelogChannel(guildId, channelId) {
  try {
    await pool.execute(
      `INSERT INTO guild_changelog_settings (guild_id, changelog_channel_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE changelog_channel_id = VALUES(changelog_channel_id)`,
      [guildId, channelId]
    );
  } catch (err) {
    logger.error('Error en setChangelogChannel:', err);
    throw err;
  }
}

/**
 * Obtiene el canal de changelog para un servidor.
 */
async function getChangelogChannel(guildId) {
  try {
    const [rows] = await pool.execute(
      'SELECT changelog_channel_id FROM guild_changelog_settings WHERE guild_id = ?',
      [guildId]
    );
    if (!rows.length) return null;
    return rows[0].changelog_channel_id;
  } catch (err) {
    logger.error('Error en getChangelogChannel:', err);
    throw err;
  }
}

/**
 * Crea una entrada de changelog.
 */
async function createChangelogEntry({ version, title, description, createdBy, changeType }) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO changelog_entries (version, title, description, created_by, change_type)
       VALUES (?, ?, ?, ?, ?)`,
      [version, title, description, createdBy, changeType]
    );
    return result.insertId;
  } catch (err) {
    logger.error('Error en createChangelogEntry:', err);
    throw err;
  }
}

/**
 * Obtiene el último changelog guardado (por si luego quieres /lastchangelog).
 */
async function getLastChangelog() {
  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM changelog_entries
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error en getLastChangelog:', err);
    throw err;
  }
}

module.exports = {
  setChangelogChannel,
  getChangelogChannel,
  createChangelogEntry,
  getLastChangelog
};

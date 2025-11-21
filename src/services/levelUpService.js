// src/services/levelUpService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Guarda o actualiza el canal donde se anuncian las subidas de nivel.
 */
async function setLevelUpChannel(guildId, channelId) {
  const sql = `
    INSERT INTO guild_levelup_settings (guild_id, channel_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
      channel_id = VALUES(channel_id)
  `;

  try {
    await pool.execute(sql, [guildId, channelId]);
  } catch (err) {
    logger.error('Error en setLevelUpChannel:', err);
    throw err;
  }
}

/**
 * Elimina el canal configurado (deja de anunciar subidas de nivel).
 */
async function clearLevelUpChannel(guildId) {
  const sql = `DELETE FROM guild_levelup_settings WHERE guild_id = ?`;

  try {
    await pool.execute(sql, [guildId]);
  } catch (err) {
    logger.error('Error en clearLevelUpChannel:', err);
    throw err;
  }
}

/**
 * Devuelve el channel_id configurado o null si no hay.
 */
async function getLevelUpChannel(guildId) {
  const sql = `
    SELECT channel_id
    FROM guild_levelup_settings
    WHERE guild_id = ?
    LIMIT 1
  `;

  try {
    const [rows] = await pool.execute(sql, [guildId]);
    if (!rows.length) return null;
    return rows[0].channel_id;
  } catch (err) {
    logger.error('Error en getLevelUpChannel:', err);
    return null;
  }
}

/**
 * Envía el mensaje de "subió de nivel" si hay canal configurado.
 */
async function announceLevelUp(client, guildId, userId, newLevel) {
  try {
    const channelId = await getLevelUpChannel(guildId);
    if (!channelId) return; // no hay canal configurado → no hacemos nada

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const channel = guild.channels.cache.get(channelId)
      || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    const mention = member ? `${member}` : `<@${userId}>`;

    await channel.send({
      content: `🎉 ${mention} ha subido al **nivel ${newLevel}**. ¡Felicidades!`
    });
  } catch (err) {
    logger.error('Error en announceLevelUp:', err);
  }
}

module.exports = {
  setLevelUpChannel,
  clearLevelUpChannel,
  getLevelUpChannel,
  announceLevelUp
};

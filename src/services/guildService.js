// src/services/guildService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Inserta o actualiza un guild en la tabla `guilds`.
 */
async function upsertGuild(guildId, name) {
  const sql = `
    INSERT INTO guilds (id, name, log_channel_id, user_event_log_channel_id)
    VALUES (?, ?, NULL, NULL)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      updated_at = CURRENT_TIMESTAMP;
  `;
  try {
    await pool.execute(sql, [guildId, name]);
  } catch (err) {
    logger.error(`Error guardando guild ${guildId} (${name}):`, err);
  }
}

/**
 * Sincroniza todos los servidores donde está el bot con la tabla `guilds`.
 */
async function syncGuilds(client) {
  try {
    const guilds = client.guilds.cache;

    logger.info(`Sincronizando ${guilds.size} servidores con la base de datos...`);

    const promises = [];
    for (const guild of guilds.values()) {
      promises.push(upsertGuild(guild.id, guild.name));
    }

    await Promise.all(promises);

    logger.info('Sincronización de servidores completada.');
  } catch (err) {
    logger.error('Error general en syncGuilds:', err);
  }
}

/**
 * Devuelve los IDs de los guilds que NO tienen log_channel configurado.
 */
async function getGuildsWithoutLogChannel() {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM guilds WHERE log_channel_id IS NULL'
    );
    return rows.map(r => r.id);
  } catch (err) {
    logger.error('Error obteniendo guilds sin log_channel:', err);
    return [];
  }
}

/**
 * Configura el canal de logs "principal" para un guild.
 */
async function setLogChannel(guildId, channelId) {
  try {
    const sql = `
      INSERT INTO guilds (id, name, log_channel_id, user_event_log_channel_id)
      VALUES (?, '', ?, NULL)
      ON DUPLICATE KEY UPDATE
        log_channel_id = VALUES(log_channel_id),
        updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.execute(sql, [guildId, channelId]);
    logger.info(`Log channel configurado para guild ${guildId}: ${channelId}`);
  } catch (err) {
    logger.error('Error configurando log_channel:', err);
    throw err;
  }
}

/**
 * Devuelve todos los guilds que tienen canal de logs principal configurado.
 * [{ id, log_channel_id }]
 */
async function getAllGuildLogChannels() {
  try {
    const [rows] = await pool.execute(
      'SELECT id, log_channel_id FROM guilds WHERE log_channel_id IS NOT NULL'
    );
    return rows;
  } catch (err) {
    logger.error('Error obteniendo canales de logs:', err);
    return [];
  }
}

/**
 * Configura el canal de logs de eventos de usuario (mensajes/voz) para un guild.
 */
async function setUserEventLogChannel(guildId, channelId) {
  try {
    const sql = `
      INSERT INTO guilds (id, name, log_channel_id, user_event_log_channel_id)
      VALUES (?, '', NULL, ?)
      ON DUPLICATE KEY UPDATE
        user_event_log_channel_id = VALUES(user_event_log_channel_id),
        updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.execute(sql, [guildId, channelId]);
    logger.info(`User event log channel configurado para guild ${guildId}: ${channelId}`);
  } catch (err) {
    logger.error('Error configurando user_event_log_channel:', err);
    throw err;
  }
}

/**
 * Obtiene el canal de logs de eventos de usuario de un guild.
 * Devuelve string o null.
 */
async function getUserEventLogChannel(guildId) {
  try {
    const [rows] = await pool.execute(
      'SELECT user_event_log_channel_id FROM guilds WHERE id = ?',
      [guildId]
    );
    if (!rows.length) return null;
    return rows[0].user_event_log_channel_id || null;
  } catch (err) {
    logger.error('Error obteniendo user_event_log_channel para guild ' + guildId, err);
    return null;
  }
}

module.exports = {
  syncGuilds,
  upsertGuild,
  getGuildsWithoutLogChannel,
  setLogChannel,
  getAllGuildLogChannels,
  setUserEventLogChannel,
  getUserEventLogChannel
};

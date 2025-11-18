// src/services/guildService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Inserta o actualiza un guild en la tabla `guilds`.
 */
async function upsertGuild(guildId, name) {
  const sql = `
    INSERT INTO guilds (id, name, log_channel_id)
    VALUES (?, ?, NULL)
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
 * Configura el canal de logs para un guild.
 */
async function setLogChannel(guildId, channelId) {
  try {
    const sql = `
      INSERT INTO guilds (id, name, log_channel_id)
      VALUES (?, '', ?)
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

module.exports = {
  syncGuilds,
  upsertGuild,
  getGuildsWithoutLogChannel,
  setLogChannel
};

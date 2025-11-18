// src/services/guildService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Sincroniza todos los servidores donde está el bot con la tabla `guilds`.
 * - Si el guild no existe, lo inserta.
 * - Si ya existe, actualiza el nombre.
 */
async function syncGuilds(client) {
  try {
    const guilds = client.guilds.cache;

    logger.info(`Sincronizando ${guilds.size} servidores con la base de datos...`);

    const sql = `
      INSERT INTO guilds (id, name, log_channel_id)
      VALUES (?, ?, NULL)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        updated_at = CURRENT_TIMESTAMP;
    `;

    const promises = [];

    for (const guild of guilds.values()) {
      promises.push(
        pool.execute(sql, [guild.id, guild.name])
          .catch(err => {
            logger.error(`Error guardando guild ${guild.id} (${guild.name}):`, err);
          })
      );
    }

    await Promise.all(promises);

    logger.info('Sincronización de servidores completada.');
  } catch (err) {
    logger.error('Error general en syncGuilds:', err);
  }
}

module.exports = {
  syncGuilds
};

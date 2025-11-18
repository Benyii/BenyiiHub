// src/services/statusLogService.js
const pool = require('../config/database');
const logger = require('../config/logger');

async function logStatusForGuild(guildId, { eventType, shardId = null, code = null, description = null }) {
  const sql = `
    INSERT INTO bot_status_logs (guild_id, event_type, shard_id, code, description)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    await pool.execute(sql, [
      guildId,
      eventType,
      shardId,
      code,
      description
    ]);
  } catch (err) {
    logger.error(`Error guardando bot_status_logs para guild ${guildId}:`, err);
  }
}

async function logStatusForAllGuilds(client, { eventType, shardId = null, code = null, description = null }) {
  const guilds = client.guilds.cache;

  const promises = [];
  for (const guild of guilds.values()) {
    promises.push(
      logStatusForGuild(guild.id, { eventType, shardId, code, description })
    );
  }

  await Promise.all(promises);
}

module.exports = {
  logStatusForGuild,
  logStatusForAllGuilds
};

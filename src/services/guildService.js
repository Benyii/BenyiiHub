// src/services/guildService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/* ───────────────────────────────────────── */
/*  Caché en memoria de filas de guild       */
/* ───────────────────────────────────────── */

const guildRowCache = new Map(); // guildId → { row, expiry }
const GUILD_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene la fila completa del guild desde la caché o la BD.
 * Evita múltiples queries a la misma tabla guilds por evento.
 */
async function getGuildRow(guildId) {
  const cached = guildRowCache.get(guildId);
  if (cached && Date.now() < cached.expiry) return cached.row;

  try {
    const [rows] = await pool.execute('SELECT * FROM guilds WHERE id = ?', [guildId]);
    const row = rows[0] || null;
    guildRowCache.set(guildId, { row, expiry: Date.now() + GUILD_CACHE_TTL });
    return row;
  } catch (err) {
    logger.error(`Error obteniendo fila de guild ${guildId}:`, err);
    return null;
  }
}

/**
 * Invalida la caché de un guild. Llamar después de cualquier UPDATE/INSERT en guilds.
 */
function invalidateGuildCache(guildId) {
  guildRowCache.delete(guildId);
}

/* ───────────────────────────────────────── */
/*  Gestión de guilds                        */
/* ───────────────────────────────────────── */

async function upsertGuild(guildId, name) {
  const sql = `
    INSERT INTO guilds (
      id,
      name,
      log_channel_id,
      user_event_log_channel_id,
      admin_event_log_channel_id,
      log_user_message_delete,
      log_user_message_edit,
      log_user_voice,
      log_admin_events
    )
    VALUES (?, ?, NULL, NULL, NULL, 1, 1, 1, 1)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      updated_at = CURRENT_TIMESTAMP;
  `;
  try {
    await pool.execute(sql, [guildId, name]);
    invalidateGuildCache(guildId);
  } catch (err) {
    logger.error(`Error guardando guild ${guildId} (${name}):`, err);
  }
}

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

/* ───────────────────────────────────────── */
/*  Log channel principal                    */
/* ───────────────────────────────────────── */

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
    invalidateGuildCache(guildId);
    logger.info(`Log channel configurado para guild ${guildId}: ${channelId}`);
  } catch (err) {
    logger.error('Error configurando log_channel:', err);
    throw err;
  }
}

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

async function getGuildLogChannel(guildId) {
  try {
    const row = await getGuildRow(guildId);
    return row?.log_channel_id || null;
  } catch (err) {
    logger.error('Error obteniendo log_channel_id para guild ' + guildId, err);
    return null;
  }
}

/* ───────────────────────────────────────── */
/*  User event logs (mensajes / voz)         */
/* ───────────────────────────────────────── */

async function setUserEventLogChannel(guildId, channelId) {
  try {
    const sql = `
      INSERT INTO guilds (id, name, user_event_log_channel_id)
      VALUES (?, '', ?)
      ON DUPLICATE KEY UPDATE
        user_event_log_channel_id = VALUES(user_event_log_channel_id),
        updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.execute(sql, [guildId, channelId]);
    invalidateGuildCache(guildId);
    logger.info(`User event log channel configurado para guild ${guildId}: ${channelId}`);
  } catch (err) {
    logger.error('Error configurando user_event_log_channel_id:', err);
    throw err;
  }
}

async function getUserEventLogChannel(guildId) {
  try {
    const row = await getGuildRow(guildId);
    return row?.user_event_log_channel_id || null;
  } catch (err) {
    logger.error('Error obteniendo user_event_log_channel_id para guild ' + guildId, err);
    return null;
  }
}

async function getUserLogFlags(guildId) {
  try {
    const row = await getGuildRow(guildId);
    if (!row) return { messageDelete: true, messageEdit: true, voice: true };
    return {
      messageDelete: !!row.log_user_message_delete,
      messageEdit:   !!row.log_user_message_edit,
      voice:         !!row.log_user_voice
    };
  } catch (err) {
    logger.error('Error obteniendo flags de user logs para guild ' + guildId, err);
    return { messageDelete: true, messageEdit: true, voice: true };
  }
}

async function setUserLogFlag(guildId, type, enabled) {
  const value = enabled ? 1 : 0;

  let column;
  switch (type) {
    case 'delete': column = 'log_user_message_delete'; break;
    case 'edit':   column = 'log_user_message_edit';   break;
    case 'voice':  column = 'log_user_voice';          break;
    default: throw new Error(`Tipo de flag de logs de usuario no válido: ${type}`);
  }

  const sql = `
    INSERT INTO guilds (id, name, ${column})
    VALUES (?, '', ?)
    ON DUPLICATE KEY UPDATE
      ${column} = VALUES(${column}),
      updated_at = CURRENT_TIMESTAMP;
  `;

  try {
    await pool.execute(sql, [guildId, value]);
    invalidateGuildCache(guildId);
    logger.info(`Flag de user log "${type}" actualizado para guild ${guildId}: ${value}`);
  } catch (err) {
    logger.error(`Error actualizando flag "${type}" de user logs para guild ${guildId}:`, err);
    throw err;
  }
}

/* ───────────────────────────────────────── */
/*  Admin event logs                         */
/* ───────────────────────────────────────── */

async function setAdminEventLogChannel(guildId, channelId) {
  try {
    const sql = `
      INSERT INTO guilds (id, name, admin_event_log_channel_id)
      VALUES (?, '', ?)
      ON DUPLICATE KEY UPDATE
        admin_event_log_channel_id = VALUES(admin_event_log_channel_id),
        updated_at = CURRENT_TIMESTAMP;
    `;
    await pool.execute(sql, [guildId, channelId]);
    invalidateGuildCache(guildId);
    logger.info(`Admin event log channel configurado para guild ${guildId}: ${channelId}`);
  } catch (err) {
    logger.error('Error configurando admin_event_log_channel_id:', err);
    throw err;
  }
}

async function getAdminEventLogChannel(guildId) {
  try {
    const row = await getGuildRow(guildId);
    return row?.admin_event_log_channel_id || null;
  } catch (err) {
    logger.error('Error obteniendo admin_event_log_channel_id para guild ' + guildId, err);
    return null;
  }
}

async function getAdminLogFlag(guildId) {
  try {
    const row = await getGuildRow(guildId);
    if (!row) return true;
    return !!row.log_admin_events;
  } catch (err) {
    logger.error('Error obteniendo flag de admin logs para guild ' + guildId, err);
    return true;
  }
}

async function setAdminLogFlag(guildId, enabled) {
  const value = enabled ? 1 : 0;
  const sql = `
    INSERT INTO guilds (id, name, log_admin_events)
    VALUES (?, '', ?)
    ON DUPLICATE KEY UPDATE
      log_admin_events = VALUES(log_admin_events),
      updated_at = CURRENT_TIMESTAMP;
  `;
  try {
    await pool.execute(sql, [guildId, value]);
    invalidateGuildCache(guildId);
    logger.info(`Flag de admin logs actualizado para guild ${guildId}: ${value}`);
  } catch (err) {
    logger.error(`Error actualizando flag de admin logs para guild ${guildId}:`, err);
    throw err;
  }
}

/* ───────────────────────────────────────── */
/*  Roles de ping (news / streams)           */
/* ───────────────────────────────────────── */

async function setNewsPingRole(guildId, roleId) {
  const sql = `
    INSERT INTO guilds (id, name, news_ping_role_id)
    VALUES (?, '', ?)
    ON DUPLICATE KEY UPDATE
      news_ping_role_id = VALUES(news_ping_role_id),
      updated_at = CURRENT_TIMESTAMP;
  `;
  try {
    await pool.execute(sql, [guildId, roleId]);
    invalidateGuildCache(guildId);
    logger.info(`News ping role configurado para guild ${guildId}: ${roleId}`);
  } catch (err) {
    logger.error(`Error configurando news_ping_role_id para guild ${guildId}:`, err);
  }
}

async function getNewsPingRole(guildId) {
  try {
    const row = await getGuildRow(guildId);
    return row?.news_ping_role_id || null;
  } catch (err) {
    logger.error(`Error obteniendo news_ping_role_id para guild ${guildId}:`, err);
    return null;
  }
}

async function setStreamsPingRole(guildId, roleId) {
  const sql = `
    INSERT INTO guilds (id, name, streams_ping_role_id)
    VALUES (?, '', ?)
    ON DUPLICATE KEY UPDATE
      streams_ping_role_id = VALUES(streams_ping_role_id),
      updated_at = CURRENT_TIMESTAMP;
  `;
  try {
    await pool.execute(sql, [guildId, roleId]);
    invalidateGuildCache(guildId);
    logger.info(`Streams ping role configurado para guild ${guildId}: ${roleId}`);
  } catch (err) {
    logger.error(`Error configurando streams_ping_role_id para guild ${guildId}:`, err);
  }
}

async function getStreamsPingRole(guildId) {
  try {
    const row = await getGuildRow(guildId);
    return row?.streams_ping_role_id || null;
  } catch (err) {
    logger.error(`Error obteniendo streams_ping_role_id para guild ${guildId}:`, err);
    return null;
  }
}

/* ───────────────────────────────────────── */
/*  Canal de anuncios de streams             */
/* ───────────────────────────────────────── */

async function setStreamAnnounceChannel(guildId, channelId) {
  const sql = `
    INSERT INTO guilds (id, name, stream_announce_channel_id)
    VALUES (?, '', ?)
    ON DUPLICATE KEY UPDATE
      stream_announce_channel_id = VALUES(stream_announce_channel_id),
      updated_at = CURRENT_TIMESTAMP;
  `;
  try {
    await pool.execute(sql, [guildId, channelId]);
    invalidateGuildCache(guildId);
    logger.info(`Stream announce channel configurado para guild ${guildId}: ${channelId}`);
  } catch (err) {
    logger.error(`Error configurando stream_announce_channel_id para guild ${guildId}:`, err);
  }
}

async function getStreamAnnounceChannel(guildId) {
  try {
    const row = await getGuildRow(guildId);
    return row?.stream_announce_channel_id || null;
  } catch (err) {
    logger.error(`Error obteniendo stream_announce_channel_id para guild ${guildId}:`, err);
    return null;
  }
}

/* ───────────────────────────────────────── */
/*  Welcome / Boost config                   */
/* ───────────────────────────────────────── */

async function setWelcomeChannel(guildId, channelId, enabled) {
  try {
    await pool.execute(
      `UPDATE guilds SET welcome_channel_id = ?, welcome_enabled = ? WHERE id = ?`,
      [channelId, enabled ? 1 : 0, guildId]
    );
    invalidateGuildCache(guildId);
  } catch (err) {
    logger.error('Error en setWelcomeChannel:', err);
    throw err;
  }
}

async function setBoostChannel(guildId, channelId, enabled) {
  try {
    await pool.execute(
      `UPDATE guilds SET boost_channel_id = ?, boost_enabled = ? WHERE id = ?`,
      [channelId, enabled ? 1 : 0, guildId]
    );
    invalidateGuildCache(guildId);
  } catch (err) {
    logger.error('Error en setBoostChannel:', err);
    throw err;
  }
}

async function getWelcomeBoostSettings(guildId) {
  try {
    const row = await getGuildRow(guildId);
    if (!row) return null;
    return {
      welcome_channel_id:    row.welcome_channel_id    ?? null,
      welcome_enabled:       row.welcome_enabled       ?? null,
      boost_channel_id:      row.boost_channel_id      ?? null,
      boost_enabled:         row.boost_enabled         ?? null,
      short_guild_name:      row.short_guild_name      ?? null,
      welcome_custom_message: row.welcome_custom_message ?? null
    };
  } catch (err) {
    logger.error('Error en getWelcomeBoostSettings:', err);
    return null;
  }
}

async function setShortGuildName(guildId, shortName) {
  try {
    await pool.execute(
      `UPDATE guilds SET short_guild_name = ? WHERE id = ?`,
      [shortName || null, guildId]
    );
    invalidateGuildCache(guildId);
  } catch (err) {
    logger.error('Error en setShortGuildName:', err);
    throw err;
  }
}

async function setWelcomeCustomMessage(guildId, message) {
  try {
    await pool.execute(
      `UPDATE guilds SET welcome_custom_message = ? WHERE id = ?`,
      [message || null, guildId]
    );
    invalidateGuildCache(guildId);
  } catch (err) {
    logger.error('Error en setWelcomeCustomMessage:', err);
    throw err;
  }
}

/* ───────────────────────────────────────── */
/*  Auto roles                               */
/* ───────────────────────────────────────── */

async function addAutoRole(guildId, roleId) {
  await pool.execute(
    `INSERT INTO guild_autoroles (guild_id, role_id) VALUES (?, ?)`,
    [guildId, roleId]
  );
}

async function removeAutoRole(guildId, roleId) {
  await pool.execute(
    `DELETE FROM guild_autoroles WHERE guild_id = ? AND role_id = ?`,
    [guildId, roleId]
  );
}

async function getAutoRoles(guildId) {
  const [rows] = await pool.execute(
    `SELECT role_id FROM guild_autoroles WHERE guild_id = ?`,
    [guildId]
  );
  return rows.map(r => r.role_id);
}


module.exports = {
  syncGuilds,
  upsertGuild,
  getGuildsWithoutLogChannel,
  setLogChannel,
  getAllGuildLogChannels,
  getGuildLogChannel,
  invalidateGuildCache,

  setUserEventLogChannel,
  getUserEventLogChannel,
  getUserLogFlags,
  setUserLogFlag,

  setAdminEventLogChannel,
  getAdminEventLogChannel,
  getAdminLogFlag,
  setAdminLogFlag,
  setNewsPingRole,
  getNewsPingRole,
  getStreamsPingRole,
  setStreamAnnounceChannel,
  getStreamAnnounceChannel,
  setWelcomeChannel,
  setBoostChannel,
  getWelcomeBoostSettings,
  setShortGuildName,
  setWelcomeCustomMessage,
  setStreamsPingRole,

  addAutoRole,
  removeAutoRole,
  getAutoRoles
};

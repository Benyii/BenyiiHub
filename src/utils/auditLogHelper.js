// src/utils/auditLogHelper.js
const { AuditLogEvent } = require('discord.js');
const logger = require('../config/logger');

// Para no spamear el mismo warning de permisos por el mismo guild muchas veces
const missingPermGuilds = new Set();

/**
 * Busca una entry reciente en los audit logs.
 *
 * @param {import('discord.js').Guild} guild
 * @param {AuditLogEvent} actionType
 * @param {string|null} targetId
 * @param {number} maxMsAgo
 * @returns {Promise<import('discord.js').GuildAuditLogsEntry|null>}
 */
async function findRecentAuditEntry(guild, actionType, targetId = null, maxMsAgo = 15000) {
  try {
    const logs = await guild.fetchAuditLogs({
      type: actionType,
      limit: 5
    });

    const now = Date.now();

    for (const entry of logs.entries.values()) {
      const targetMatches = !targetId || entry.target?.id === targetId;
      const freshEnough = now - entry.createdTimestamp <= maxMsAgo;

      if (targetMatches && freshEnough) {
        return entry;
      }
    }

    return null;
  } catch (err) {
    // Si no tiene permisos para ver audit logs
    if (err.code === 50013 || err.status === 403) {
      const key = guild.id;
      if (!missingPermGuilds.has(key)) {
        missingPermGuilds.add(key);
        logger.warn(
          `No tengo permiso para ver audit logs en el guild ${guild.id} (${guild.name}). ` +
          `Otorga el permiso "View Audit Log" al bot si quieres ver quién ejecutó las acciones.`
        );
      }
      // No spameamos error, solo devolvemos null
      return null;
    }

    // Otros errores sí los mostramos como error
    logger.error('Error leyendo audit logs:', err);
    return null;
  }
}

/**
 * Devuelve el executor (User) de una acción reciente.
 */
async function fetchAuditExecutor(guild, actionType, targetId = null, maxMsAgo = 15000) {
  const entry = await findRecentAuditEntry(guild, actionType, targetId, maxMsAgo);
  return entry?.executor ?? null;
}

/**
 * Devuelve una línea lista para el log con el ejecutor.
 */
async function getExecutorLine(guild, actionType, targetId = null, maxMsAgo = 15000) {
  const entry = await findRecentAuditEntry(guild, actionType, targetId, maxMsAgo);
  if (!entry?.executor) {
    return 'Ejecutado por: (no disponible / sin permiso de audit log o no encontrado)';
  }
  return `Ejecutado por: ${entry.executor.tag} (${entry.executor.id})`;
}

/**
 * Devuelve { executor, reason } de una acción reciente.
 */
async function getExecutorAndReason(guild, actionType, targetId = null, maxMsAgo = 15000) {
  const entry = await findRecentAuditEntry(guild, actionType, targetId, maxMsAgo);
  if (!entry) {
    return {
      executor: null,
      reason: null
    };
  }
  return {
    executor: entry.executor ?? null,
    reason: entry.reason ?? null
  };
}

module.exports = {
  AuditLogEvent,
  findRecentAuditEntry,
  fetchAuditExecutor,
  getExecutorLine,
  getExecutorAndReason
};

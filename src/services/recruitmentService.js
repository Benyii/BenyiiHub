// src/services/recruitmentService.js
const pool = require('../config/database');
const logger = require('../config/logger');

async function setRecruitChannel(guildId, channelId, messageId) {
  try {
    await pool.execute(
      `INSERT INTO guild_recruitment_settings
        (guild_id, recruit_channel_id, recruit_message_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         recruit_channel_id = VALUES(recruit_channel_id),
         recruit_message_id = VALUES(recruit_message_id)`,
      [guildId, channelId, messageId]
    );
  } catch (err) {
    logger.error('Error setRecruitChannel:', err);
    throw err;
  }
}

async function setRecruitTicketCategory(guildId, categoryId) {
  try {
    await pool.execute(
      `INSERT INTO guild_recruitment_settings
        (guild_id, ticket_category_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         ticket_category_id = VALUES(ticket_category_id)`,
      [guildId, categoryId]
    );
  } catch (err) {
    logger.error('Error setRecruitTicketCategory:', err);
    throw err;
  }
}

async function getRecruitSettings(guildId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM guild_recruitment_settings WHERE guild_id = ?',
      [guildId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error getRecruitSettings:', err);
    throw err;
  }
}

/**
 * Crea la postulación (sin ticket aún).
 * Devuelve el ID insertado.
 */
async function createApplication({
  guildId,
  userId,
  deltaName,
  deltaUid,
  country,
  schedule
}) {
  try {
    const [res] = await pool.execute(
      `INSERT INTO recruitment_applications
        (guild_id, user_id, delta_name, delta_uid, country, schedule, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [guildId, userId, deltaName, deltaUid, country, schedule]
    );
    return res.insertId;
  } catch (err) {
    logger.error('Error createApplication:', err);
    throw err;
  }
}

/**
 * Vincula el ticket (canal) a la postulación.
 */
async function linkApplicationTicket(applicationId, channelId) {
  try {
    await pool.execute(
      `UPDATE recruitment_applications
       SET ticket_channel_id = ?
       WHERE id = ?`,
      [channelId, applicationId]
    );
  } catch (err) {
    logger.error('Error linkApplicationTicket:', err);
    throw err;
  }
}

/**
 * Obtiene la postulación asociada a un canal de ticket.
 */
async function getApplicationByChannel(guildId, channelId) {
  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM recruitment_applications
       WHERE guild_id = ? AND ticket_channel_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [guildId, channelId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error getApplicationByChannel:', err);
    throw err;
  }
}

/**
 * Cambia el estado de la postulación asociada al canal.
 */
async function setApplicationStatusByChannel(guildId, channelId, status, moderatorId) {
  try {
    await pool.execute(
      `UPDATE recruitment_applications
       SET status = ?, updated_at = NOW(), last_updated_by = ?
       WHERE guild_id = ? AND ticket_channel_id = ?`,
      [status, moderatorId, guildId, channelId]
    );
  } catch (err) {
    logger.error('Error setApplicationStatusByChannel:', err);
    throw err;
  }
}

/**
 * Marca la postulación de este canal como cerrada.
 */
async function closeApplicationByChannel(guildId, channelId, moderatorId) {
  try {
    await pool.execute(
      `UPDATE recruitment_applications
       SET closed = 1, updated_at = NOW(), last_updated_by = ?
       WHERE guild_id = ? AND ticket_channel_id = ?`,
      [moderatorId, guildId, channelId]
    );
  } catch (err) {
    logger.error('Error closeApplicationByChannel:', err);
    throw err;
  }
}

module.exports = {
  setRecruitChannel,
  setRecruitTicketCategory,
  getRecruitSettings,
  createApplication,
  linkApplicationTicket,
  getApplicationByChannel,
  setApplicationStatusByChannel,
  closeApplicationByChannel
};

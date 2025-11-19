// src/services/dynamicVoiceService.js
const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Crea una nueva configuración de canales dinámicos para una categoría origen.
 * Devuelve el ID de configuración.
 */
async function createDynamicCategoryConfig(guildId, sourceCategoryId) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO guild_dynamic_voice_configs (guild_id, source_category_id)
       VALUES (?, ?)`,
      [guildId, sourceCategoryId]
    );
    return result.insertId;
  } catch (err) {
    logger.error('Error createDynamicCategoryConfig:', err);
    throw err;
  }
}

/**
 * Establece la categoría destino donde se crearán los canales dinámicos.
 */
async function setDynamicTargetCategory(guildId, configId, targetCategoryId) {
  try {
    await pool.execute(
      `UPDATE guild_dynamic_voice_configs
       SET target_category_id = ?
       WHERE id = ? AND guild_id = ?`,
      [targetCategoryId, configId, guildId]
    );
  } catch (err) {
    logger.error('Error setDynamicTargetCategory:', err);
    throw err;
  }
}

/**
 * Guarda el canal "creador", el nombre base y el userLimit de los canales dinámicos.
 */
async function setCreatorChannel(guildId, configId, creatorChannelId, baseName, dynamicUserLimit) {
  try {
    await pool.execute(
      `UPDATE guild_dynamic_voice_configs
       SET creator_channel_id = ?, base_name = ?, dynamic_user_limit = ?
       WHERE id = ? AND guild_id = ?`,
      [creatorChannelId, baseName, dynamicUserLimit ?? 0, configId, guildId]
    );
  } catch (err) {
    logger.error('Error setCreatorChannel:', err);
    throw err;
  }
}

/**
 * Obtiene una config por ID.
 */
async function getDynamicConfigById(guildId, configId) {
  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM guild_dynamic_voice_configs
       WHERE guild_id = ? AND id = ?`,
      [guildId, configId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error getDynamicConfigById:', err);
    throw err;
  }
}

/**
 * Obtiene una config dado un canal "creador".
 */
async function getDynamicConfigByCreatorChannel(guildId, creatorChannelId) {
  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM guild_dynamic_voice_configs
       WHERE guild_id = ? AND creator_channel_id = ?`,
      [guildId, creatorChannelId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error getDynamicConfigByCreatorChannel:', err);
    throw err;
  }
}

/**
 * Lista todas las configs de un servidor (útil para debug).
 */
async function listDynamicConfigs(guildId) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM guild_dynamic_voice_configs WHERE guild_id = ?`,
      [guildId]
    );
    return rows;
  } catch (err) {
    logger.error('Error listDynamicConfigs:', err);
    throw err;
  }
}

/* ======================================================
 *                INSTANCIAS DINÁMICAS
 * ====================================================*/

/**
 * Registra una instancia de canal dinámico creado.
 */
async function createDynamicInstance(guildId, configId, channelId) {
  try {
    await pool.execute(
      `INSERT INTO guild_dynamic_voice_instances (guild_id, config_id, channel_id)
       VALUES (?, ?, ?)`,
      [guildId, configId, channelId]
    );
  } catch (err) {
    logger.error('Error createDynamicInstance:', err);
  }
}

/**
 * Obtiene una instancia por channel_id.
 */
async function getInstanceByChannel(guildId, channelId) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM guild_dynamic_voice_instances
       WHERE guild_id = ? AND channel_id = ?`,
      [guildId, channelId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error getInstanceByChannel:', err);
    return null;
  }
}

/**
 * Elimina la instancia asociada a un channel_id.
 */
async function deleteInstanceByChannel(guildId, channelId) {
  try {
    await pool.execute(
      `DELETE FROM guild_dynamic_voice_instances
       WHERE guild_id = ? AND channel_id = ?`,
      [guildId, channelId]
    );
  } catch (err) {
    logger.error('Error deleteInstanceByChannel:', err);
  }
}

module.exports = {
  createDynamicCategoryConfig,
  setDynamicTargetCategory,
  setCreatorChannel,
  getDynamicConfigById,
  getDynamicConfigByCreatorChannel,
  listDynamicConfigs,
  createDynamicInstance,
  getInstanceByChannel,
  deleteInstanceByChannel
};

// src/services/rulesService.js
const pool = require('../config/database');
const logger = require('../config/logger');

async function setRulesChannel(guildId, channelId, messageId = null) {
  try {
    await pool.execute(
      `INSERT INTO guild_rules_settings (guild_id, rules_channel_id, rules_message_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rules_channel_id = VALUES(rules_channel_id),
         rules_message_id = VALUES(rules_message_id)`,
      [guildId, channelId, messageId]
    );
  } catch (err) {
    logger.error('Error setRulesChannel:', err);
    throw err;
  }
}

async function updateRulesMessageId(guildId, messageId) {
  try {
    await pool.execute(
      `UPDATE guild_rules_settings
       SET rules_message_id = ?
       WHERE guild_id = ?`,
      [messageId, guildId]
    );
  } catch (err) {
    logger.error('Error updateRulesMessageId:', err);
    throw err;
  }
}

async function getRulesSettings(guildId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM guild_rules_settings WHERE guild_id = ?',
      [guildId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error getRulesSettings:', err);
    throw err;
  }
}

async function addRule(guildId, title, description) {
  try {
    const [rows] = await pool.execute(
      'SELECT COALESCE(MAX(rule_index), 0) AS maxIndex FROM guild_rules WHERE guild_id = ?',
      [guildId]
    );
    const nextIndex = (rows[0]?.maxIndex || 0) + 1;

    await pool.execute(
      `INSERT INTO guild_rules (guild_id, rule_index, title, description)
       VALUES (?, ?, ?, ?)`,
      [guildId, nextIndex, title, description]
    );

    return nextIndex;
  } catch (err) {
    logger.error('Error addRule:', err);
    throw err;
  }
}

async function removeRuleByIndex(guildId, ruleIndex) {
  try {
    await pool.execute(
      `DELETE FROM guild_rules
       WHERE guild_id = ? AND rule_index = ?`,
      [guildId, ruleIndex]
    );
  } catch (err) {
    logger.error('Error removeRuleByIndex:', err);
    throw err;
  }
}

async function getRules(guildId) {
  try {
    const [rows] = await pool.execute(
      `SELECT rule_index, title, description
       FROM guild_rules
       WHERE guild_id = ?
       ORDER BY rule_index ASC`,
      [guildId]
    );
    return rows;
  } catch (err) {
    logger.error('Error getRules:', err);
    throw err;
  }
}

module.exports = {
  setRulesChannel,
  updateRulesMessageId,
  getRulesSettings,
  addRule,
  removeRuleByIndex,
  getRules
};

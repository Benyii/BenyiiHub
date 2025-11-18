const { jtc } = require('../config/config');
const pool = require('../config/database');
const logger = require('../config/logger');

async function createUserChannelIfNeeded(oldState, newState) {
  // Usuario entra al canal "hub" JTC
  if (!jtc.channelId || !jtc.categoryId) return;

  const joinedHub =
    (!oldState.channelId && newState.channelId === jtc.channelId) ||
    (oldState.channelId !== jtc.channelId && newState.channelId === jtc.channelId);

  if (!joinedHub) return;

  const guild = newState.guild;
  const member = newState.member;

  try {
    const category = guild.channels.cache.get(jtc.categoryId);
    if (!category) {
      logger.warn('Categoría JTC no encontrada');
      return;
    }

    const channelName = `🔊 ${member.displayName}`;
    const newChannel = await guild.channels.create({
      name: channelName,
      type: 2, // GUILD_VOICE
      parent: category,
      userLimit: jtc.userLimit || 4,
      reason: `Canal temporal para ${member.user.tag}`
    });

    await member.voice.setChannel(newChannel);

    const sql = `
      INSERT INTO dynamic_voice_channels (guild_id, owner_id, channel_id)
      VALUES (?, ?, ?)
    `;
    await pool.execute(sql, [guild.id, member.id, newChannel.id]);

    logger.info(`Canal dinámico creado: ${newChannel.name} (${newChannel.id})`);
  } catch (err) {
    logger.error('Error creando canal dinámico:', err);
  }
}

async function deleteUserChannelIfEmpty(oldState, newState) {
  if (!oldState.channelId) return;

  const guild = oldState.guild;
  const leftChannel = oldState.channel;

  if (!leftChannel) return;

  try {
    const [rows] = await pool.execute(
      'SELECT id FROM dynamic_voice_channels WHERE channel_id = ?',
      [leftChannel.id]
    );

    if (rows.length === 0) return;

    if (leftChannel.members.size === 0) {
      await leftChannel.delete('Canal dinámico vacío, eliminado automáticamente');
      await pool.execute('DELETE FROM dynamic_voice_channels WHERE channel_id = ?', [leftChannel.id]);
      logger.info(`Canal dinámico eliminado: ${leftChannel.id}`);
    }
  } catch (err) {
    logger.error('Error eliminando canal dinámico:', err);
  }
}

module.exports = {
  createUserChannelIfNeeded,
  deleteUserChannelIfEmpty
};

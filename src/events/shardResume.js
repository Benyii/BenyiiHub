// src/events/shardResume.js
const { sendLogToAllGuilds } = require('../services/logChannelService');
const { logStatusForAllGuilds } = require('../services/statusLogService');
const logger = require('../config/logger');

module.exports = {
  name: 'shardResume',
  async execute(shardId, replayedEvents, client) {
    const nowTs = Math.floor(Date.now() / 1000);

    logger.info(`Shard ${shardId} ha reanudado la sesión. Eventos re-jugados: ${replayedEvents}`);

    // 1) Guardar en la DB para todos los guilds
    await logStatusForAllGuilds(client, {
      eventType: 'RESUME',
      shardId,
      code: null,
      description: `Shard reanudado. Eventos re-jugados: ${replayedEvents}`
    });

    // 2) Enviar a canales de logs (embed verde: success)
    await sendLogToAllGuilds(client, {
      level: 'success',
      title: 'Reconexión del bot',
      description:
        `✅ El bot ha **recuperado la conexión** con Discord (shard **${shardId}**).\n` +
        `Eventos re-jugados: \`${replayedEvents}\`\n` +
        `Hora: <t:${nowTs}:F> (<t:${nowTs}:R>)`
    });
  }
};

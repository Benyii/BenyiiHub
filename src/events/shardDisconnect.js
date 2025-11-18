// src/events/shardDisconnect.js
const { sendLogToAllGuilds } = require('../services/logChannelService');
const { logStatusForAllGuilds } = require('../services/statusLogService');
const logger = require('../config/logger');

module.exports = {
  name: 'shardDisconnect',
  async execute(event, shardId, client) {
    const nowTs = Math.floor(Date.now() / 1000);

    logger.warn(`Shard ${shardId} desconectado. Código: ${event.code}`);

    // 1) Guardar en la DB para todos los guilds
    await logStatusForAllGuilds(client, {
      eventType: 'DISCONNECT',
      shardId,
      code: event.code,
      description: 'Shard desconectado del gateway de Discord'
    });

    // 2) Enviar a canales de logs (embed amarillo: warning)
    await sendLogToAllGuilds(client, {
      level: 'warning',
      title: 'Desconexión del bot',
      description:
        `⚠️ El bot ha perdido la conexión con Discord (shard **${shardId}**).\n` +
        `Código: \`${event.code}\`\n` +
        `Hora del evento: <t:${nowTs}:F> (<t:${nowTs}:R>)`
    });
  }
};

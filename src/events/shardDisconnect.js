// src/events/shardDisconnect.js
const { sendLogToAllGuilds } = require('../services/logChannelService');
const { logStatusForAllGuilds } = require('../services/statusLogService');
const { recordDisconnect } = require('../services/connectionState');
const logger = require('../config/logger');

module.exports = {
  name: 'shardDisconnect',
  async execute(event, shardId, client) {
    logger.warn(`Shard ${shardId} desconectado. Código: ${event.code}`);

    // Guardar SIEMPRE en la DB (histórico, no genera spam visible)
    await logStatusForAllGuilds(client, {
      eventType: 'DISCONNECT',
      shardId,
      code: event.code,
      description: 'Shard desconectado del gateway de Discord'
    });

    // El embed de desconexión se envía solo si el shard sigue caído tras un
    // pequeño margen. Las reanudaciones rutinarias del gateway lo cancelan.
    recordDisconnect(shardId, event.code, async () => {
      const nowTs = Math.floor(Date.now() / 1000);
      await sendLogToAllGuilds(client, {
        level: 'warning',
        title: 'Desconexión del bot',
        description:
          `⚠️ El bot ha perdido la conexión con Discord (shard **${shardId}**).\n` +
          `Código: \`${event.code}\`\n` +
          `Hora del evento: <t:${nowTs}:F> (<t:${nowTs}:R>)`
      });
    });
  }
};

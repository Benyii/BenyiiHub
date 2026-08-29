// src/events/shardResume.js
const { sendLogToAllGuilds } = require('../services/logChannelService');
const { logStatusForAllGuilds } = require('../services/statusLogService');
const { clearDisconnect } = require('../services/connectionState');
const logger = require('../config/logger');

module.exports = {
  name: 'shardResume',
  async execute(shardId, replayedEvents, client) {
    logger.info(`Shard ${shardId} ha reanudado la sesión. Eventos re-jugados: ${replayedEvents}`);

    // Guardar SIEMPRE en la DB
    await logStatusForAllGuilds(client, {
      eventType: 'RESUME',
      shardId,
      code: null,
      description: `Shard reanudado. Eventos re-jugados: ${replayedEvents}`
    });

    // Solo anunciar la reconexión si antes se anunció una desconexión real.
    // Las reanudaciones rutinarias del gateway (varias al día) quedan en silencio.
    const entry = clearDisconnect(shardId);
    if (!entry || !entry.announced) return;

    const nowTs = Math.floor(Date.now() / 1000);
    const downSeconds = Math.max(1, Math.round((Date.now() - entry.since) / 1000));

    await sendLogToAllGuilds(client, {
      level: 'success',
      title: 'Reconexión del bot',
      description:
        `✅ El bot ha **recuperado la conexión** con Discord (shard **${shardId}**).\n` +
        `Tiempo sin conexión: ~${downSeconds}s\n` +
        `Eventos re-jugados: \`${replayedEvents}\`\n` +
        `Hora: <t:${nowTs}:F> (<t:${nowTs}:R>)`
    });
  }
};

// src/events/shardReady.js
//
// Cuando la sesión no se puede reanudar (invalidada por Discord), el shard
// vuelve con un READY nuevo en vez de un RESUME. Este handler cierra el estado
// de desconexión y anuncia la reconexión si la caída ya se había anunciado.
// En el arranque normal no hay desconexión registrada => no anuncia nada.

const { sendLogToAllGuilds } = require('../services/logChannelService');
const { clearDisconnect } = require('../services/connectionState');

module.exports = {
  name: 'shardReady',
  async execute(shardId, _unavailableGuilds, client) {
    const entry = clearDisconnect(shardId);
    if (!entry || !entry.announced) return;

    const nowTs = Math.floor(Date.now() / 1000);
    const downSeconds = Math.max(1, Math.round((Date.now() - entry.since) / 1000));

    await sendLogToAllGuilds(client, {
      level: 'success',
      title: 'Reconexión del bot',
      description:
        `✅ El bot ha **restablecido la conexión** con Discord (shard **${shardId}**) ` +
        `tras reiniciar la sesión.\n` +
        `Tiempo sin conexión: ~${downSeconds}s\n` +
        `Hora: <t:${nowTs}:F> (<t:${nowTs}:R>)`
    });
  }
};

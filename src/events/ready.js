// src/events/ready.js
const {
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const logger = require('../config/logger');
const {
  syncGuilds,
  getGuildsWithoutLogChannel
} = require('../services/guildService');
const { sendLogToAllGuilds } = require('../services/logChannelService');
const { logStatusForAllGuilds } = require('../services/statusLogService');
const { startTwitchWatcher } = require('../services/twitchWatcher');
const { reloadAllRolePanels } = require('../services/rolePanelService');

/**
 * Devuelve el primer canal de texto donde el bot pueda enviar mensajes.
 */
function findFirstWritableTextChannel(guild) {
  const me = guild.members.me;
  if (!me) return null;

  const textChannels = guild.channels.cache
    .filter(ch =>
      (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
    )
    .sort((a, b) => a.rawPosition - b.rawPosition);

  for (const channel of textChannels.values()) {
    const perms = me.permissionsIn(channel);
    if (perms.has(PermissionsBitField.Flags.ViewChannel) &&
        perms.has(PermissionsBitField.Flags.SendMessages)) {
      return channel;
    }
  }

  return null;
}

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`Bot iniciado como ${client.user.tag}`);
    logger.info(`Actualmente en ${client.guilds.cache.size} servidores.`);

    // 0) Servicios de fondo (antes se lanzaban desde src/index.js)
    try {
      startTwitchWatcher(client);
      reloadAllRolePanels(client);
      logger.info('Twitch watcher y paneles de roles inicializados.');
    } catch (err) {
      logger.error('Error inicializando servicios de fondo:', err);
    }

    // 1) Sincronizar guilds con la DB
    await syncGuilds(client);

    // 2) Avisar a guilds que no tienen canal de logs configurado (mensaje normal, no embed)
    const guildsWithoutLogs = await getGuildsWithoutLogChannel();

    for (const guildId of guildsWithoutLogs) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const channel = findFirstWritableTextChannel(guild);
      if (!channel) {
        logger.warn(`No se encontró canal escribible para avisar falta de log_channel en guild ${guild.id}`);
        continue;
      }

      try {
        await channel.send(
          '👋 ¡Hola! Gracias por usar este bot.\n\n' +
          'Aún **no has configurado un canal de logs** para este servidor.\n' +
          'Un administrador puede usar el comando `/setlogchannel` en este canal, ' +
          'o pasar un canal como parámetro, para definir dónde se enviarán los logs.'
        );
      } catch (err) {
        logger.error(`Error enviando mensaje de falta de log_channel en guild ${guild.id}:`, err);
      }
    }

    // 3) Registrar en la DB que el bot se ha iniciado (por cada guild)
    await logStatusForAllGuilds(client, {
      eventType: 'STARTUP',
      shardId: client.shard?.ids?.[0] ?? 0,
      code: null,
      description: 'Bot iniciado y operativo'
    });

    // 4) Avisar en los canales de logs que el bot está operativo (embed verde)
    const nowTs = Math.floor(Date.now() / 1000);

    await sendLogToAllGuilds(client, {
      level: 'success',
      title: 'Bot iniciado',
      description:
        `✅ El bot se ha iniciado y está **operativo**.\n` +
        `Hora de inicio: <t:${nowTs}:F> (<t:${nowTs}:R>)`
    });
  }
};

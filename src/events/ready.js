// src/events/ready.js
const {
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const logger = require('../config/logger');
const { syncGuilds, getGuildsWithoutLogChannel } = require('../services/guildService');

/**
 * Devuelve el primer canal de texto donde el bot pueda enviar mensajes.
 */
function findFirstWritableTextChannel(guild) {
  const me = guild.members.me;
  if (!me) return null;

  // Ordenamos por posición para que normalmente elija un canal "alto"
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
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot iniciado como ${client.user.tag}`);
    logger.info(`Actualmente en ${client.guilds.cache.size} servidores.`);

    // 1) Sincronizar guilds con la DB
    await syncGuilds(client);

    // 2) Obtener guilds sin canal de logs configurado
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
  }
};

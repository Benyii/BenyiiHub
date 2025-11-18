// src/events/guildCreate.js
const {
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const logger = require('../config/logger');
const { upsertGuild } = require('../services/guildService');

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
  name: 'guildCreate',
  async execute(guild) {
    logger.info(`Agregado a un nuevo servidor: ${guild.name} (${guild.id})`);

    // Guardar/actualizar el guild en la base de datos
    await upsertGuild(guild.id, guild.name);

    const channel = findFirstWritableTextChannel(guild);
    if (!channel) {
      logger.warn(`No se encontró canal para mensaje de bienvenida en guild ${guild.id}`);
      return;
    }

    try {
      await channel.send(
        `👋 ¡Hola! Gracias por invitarme a **${guild.name}**.\n\n` +
        'Para comenzar, te recomiendo:\n' +
        '• Configurar un canal de logs con: `/setlogchannel` (ejecútalo en el canal que quieras usar o pásalo como parámetro)\n' +
        '• Usar `/ping` para verificar que todo funciona\n' +
        '• Usar `/top` para ver el leaderboard de actividad cuando ya haya datos\n\n' +
        'Si tienes dudas, pide ayuda a un administrador o revisa la documentación del bot.'
      );
    } catch (err) {
      logger.error(`Error enviando mensaje de bienvenida en guild ${guild.id}:`, err);
    }
  }
};

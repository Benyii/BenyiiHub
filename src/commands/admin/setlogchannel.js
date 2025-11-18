// src/commands/admin/setlogchannel.js
const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const { setLogChannel } = require('../../services/guildService');
const { sendErrorLogToGuild, sendLogToGuild } = require('../../services/logChannelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Configura el canal actual o uno específico como canal de logs del bot')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Canal que se usará para los logs (opcional, por defecto el canal actual)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Este comando solo puede usarse dentro de un servidor.',
        flags: 64
      });
    }

    // Solo admins (puedes adaptar esto a ManageGuild, etc.)
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Solo administradores pueden configurar el canal de logs.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption || interaction.channel;

    try {
      await setLogChannel(guild.id, targetChannel.id);

      await interaction.reply({
        content: `✅ Canal de logs configurado correctamente: ${targetChannel}`,
        flags: 64
      });

      // Mensaje informativo en el canal de logs usando embed "info"
      await sendLogToGuild(interaction.client, guild.id, {
        level: 'info',
        title: 'Canal de logs configurado',
        description:
          `Este canal (${targetChannel}) ha sido configurado como **canal de logs** del bot.\n` +
          `Comando ejecutado por: ${interaction.user.tag} (${interaction.user.id})`
      });
    } catch (err) {
      console.error(err);

      await interaction.reply({
        content: '❌ Ocurrió un error configurando el canal de logs.',
        flags: 64
      });

      // Log de error (incluye stack truncado)
      await sendErrorLogToGuild(interaction.client, guild.id, {
        title: 'Error en /setlogchannel',
        description:
          `Ocurrió un error intentando configurar el canal de logs.\n` +
          `Usuario: ${interaction.user.tag} (${interaction.user.id})\n` +
          `Canal objetivo: ${targetChannel} (${targetChannel.id})`,
        error: err
      });
    }
  }
};

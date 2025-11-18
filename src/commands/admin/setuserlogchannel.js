// src/commands/admin/setuserlogchannel.js
const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const { setUserEventLogChannel } = require('../../services/guildService');
const { sendUserEventLog } = require('../../services/userEventLogService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuserlogchannel')
    .setDescription('Configura el canal donde se registrarán eventos de usuario (mensajes, voz, etc.)')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Canal que se usará para los eventos de usuario (opcional, por defecto el canal actual)')
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

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Solo administradores pueden usar `/setuserlogchannel`.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption || interaction.channel;

    try {
      await setUserEventLogChannel(guild.id, targetChannel.id);

      await interaction.reply({
        content: `✅ Canal de eventos de usuario configurado correctamente: ${targetChannel}`,
        flags: 64
      });

      // Log de prueba (INFO)
      await sendUserEventLog(interaction.client, guild.id, {
        title: 'Canal de eventos de usuario configurado',
        description:
          `Este canal (${targetChannel}) ha sido configurado para recibir logs de eventos de usuario.\n` +
          `Comando ejecutado por: ${interaction.user.tag} (${interaction.user.id})`
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocurrió un error configurando el canal de eventos de usuario.',
        flags: 64
      });
    }
  }
};

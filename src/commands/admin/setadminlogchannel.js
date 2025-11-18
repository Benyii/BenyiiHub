// src/commands/admin/setadminlogchannel.js
const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const { setAdminEventLogChannel } = require('../../services/guildService');
const { sendAdminEventLog } = require('../../services/adminEventLogService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setadminlogchannel')
    .setDescription('Configura el canal donde se registrarán eventos administrativos del servidor')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Canal de logs administrativos (opcional, por defecto el canal actual)')
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
        content: '❌ Solo administradores pueden usar `/setadminlogchannel`.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption || interaction.channel;

    try {
      await setAdminEventLogChannel(guild.id, targetChannel.id);

      await interaction.reply({
        content: `✅ Canal de eventos administrativos configurado correctamente: ${targetChannel}`,
        flags: 64
      });

      await sendAdminEventLog(interaction.client, guild.id, {
        title: 'Canal de eventos administrativos configurado',
        description:
          `Este canal (${targetChannel}) ha sido configurado para recibir logs de administración del servidor.\n` +
          `Comando ejecutado por: ${interaction.user.tag} (${interaction.user.id})`
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocurrió un error configurando el canal de eventos administrativos.',
        flags: 64
      });
    }
  }
};

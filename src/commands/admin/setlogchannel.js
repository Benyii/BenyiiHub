// src/commands/admin/setlogchannel.js
const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const { setLogChannel } = require('../../services/guildService');

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
        flags: MessageFlags.Ephemeral
      });
    }

    // Solo admins (puedes adaptar esto a ManageGuild, etc.)
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Solo administradores pueden configurar el canal de logs.',
        flags: MessageFlags.Ephemeral
      });
    }

    const guild = interaction.guild;
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption || interaction.channel;

    try {
      await setLogChannel(guild.id, targetChannel.id);

      await interaction.reply({
        content: `✅ Canal de logs configurado correctamente: ${targetChannel}`,
        flags: MessageFlags.Ephemeral
      });

      // Mensaje público en el canal de logs
      await targetChannel.send(
        '📝 Este canal ha sido configurado como **canal de logs** del bot.\n' +
        'Aquí se enviarán mensajes importantes relacionados con la actividad y eventos del servidor.'
      );
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocurrió un error configurando el canal de logs.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const { setWelcomeChannel } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcomechannel')
    .setDescription('Configura el canal de mensajes de bienvenida.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde se enviarán las bienvenidas.')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('habilitado')
        .setDescription('Habilitar o deshabilitar las bienvenidas.')
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = interaction.options.getChannel('canal', true);
      const habilitadoOpt = interaction.options.getBoolean('habilitado');
      const enabled = habilitadoOpt === null ? true : habilitadoOpt;

      if (!channel.isTextBased()) {
        await interaction.editReply('❌ El canal debe ser un canal de texto.');
        return;
      }

      await setWelcomeChannel(interaction.guild.id, channel.id, enabled);

      await interaction.editReply(
        `✅ Canal de bienvenidas configurado en ${channel} (estado: ${
          enabled ? 'habilitado' : 'deshabilitado'
        }).`
      );
    } catch (err) {
      logger.error('Error en /setwelcomechannel:', err);
      await interaction.editReply(
        '❌ Ocurrió un error configurando el canal de bienvenidas.'
      );
    }
  }
};

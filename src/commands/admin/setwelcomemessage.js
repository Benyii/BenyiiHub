const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const { setWelcomeCustomMessage } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcomemessage')
    .setDescription('Configura el mensaje de texto de bienvenida que acompaña la imagen.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('mensaje')
        .setDescription(
          'Mensaje de bienvenida. Puedes usar {user}, {mention} y {server} como variables.'
        )
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const mensaje = interaction.options.getString('mensaje', true);

      await setWelcomeCustomMessage(interaction.guild.id, mensaje);

      await interaction.editReply(
        '✅ Mensaje de bienvenida actualizado.\n' +
        'Variables disponibles: `{user}`, `{mention}`, `{server}`.'
      );
    } catch (err) {
      logger.error('Error en /setwelcomemessage:', err);
      await interaction.editReply('❌ Ocurrió un error guardando el mensaje de bienvenida.');
    }
  }
};

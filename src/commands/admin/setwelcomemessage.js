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
    .setDescription('Configura el mensaje de bienvenida que acompaña la imagen.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('mensaje')
        .setDescription(
          'Mensaje de bienvenida. Soporta {user}, {mention}, {server} y menciones reales (<#canal>, <@&rol>, <@usuario>).'
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
        'Variables disponibles:\n' +
        '`{user}` = nombre de usuario\n' +
        '`{mention}` = mención del usuario\n' +
        '`{server}` = nombre corto\n' +
        'Además puedes usar directamente: `<#ID>`, `<@&ID>`, `<@ID>`'
      );
    } catch (err) {
      logger.error('Error en /setwelcomemessage:', err);
      await interaction.editReply('❌ Error guardando el mensaje.');
    }
  }
};

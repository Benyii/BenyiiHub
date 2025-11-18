const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const { setShortGuildName } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setshortguildname')
    .setDescription('Configura el nombre corto del servidor para las bienvenidas.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre corto que aparecerá en la imagen (ej: Black Bears). Vacío para reset.')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const name = interaction.options.getString('nombre', true).trim();

      const value = name.length ? name : null;
      await setShortGuildName(interaction.guild.id, value);

      await interaction.editReply(
        value
          ? `✅ Nombre corto del servidor actualizado a **${value}**.`
          : '✅ Nombre corto del servidor reseteado (se usará el nombre real del servidor).'
      );
    } catch (err) {
      logger.error('Error en /setshortguildname:', err);
      await interaction.editReply('❌ Ocurrió un error guardando el nombre corto.');
    }
  }
};

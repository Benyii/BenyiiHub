// src/commands/admin/voiceblacklist_remove.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { removeBlacklistedChannel } = require('../../services/voiceBlacklistService');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voiceblacklist_remove')
    .setDescription('Quita un canal de voz de la blacklist del sistema de actividad.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal de voz que volverá a contar actividad.')
        .setRequired(true)
    ),
  isAdmin: true,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const channel = interaction.options.getChannel('canal', true);

      if (!channel.isVoiceBased()) {
        await interaction.editReply('❌ El canal seleccionado debe ser un canal de voz.');
        return;
      }

      await removeBlacklistedChannel(guildId, channel.id);
      await interaction.editReply(
        `✅ El canal de voz ${channel} ha sido eliminado de la blacklist de actividad.`
      );
    } catch (err) {
      logger.error('Error en /voiceblacklist_remove:', err);
      try {
        await interaction.editReply(
          '❌ Ocurrió un error al eliminar el canal de voz de la blacklist.'
        );
      } catch (err2) {
        logger.error('Error enviando respuesta de error en /voiceblacklist_remove:', err2);
      }
    }
  }
};

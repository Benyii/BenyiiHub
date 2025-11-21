// src/commands/admin/voiceblacklist_add.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { addBlacklistedChannel } = require('../../services/voiceBlacklistService');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voiceblacklist_add')
    .setDescription('Agrega un canal de voz a la blacklist del sistema de actividad.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal de voz que no contará actividad.')
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

      await addBlacklistedChannel(guildId, channel.id);
      await interaction.editReply(
        `✅ El canal de voz ${channel} ahora está en la blacklist de actividad.`
      );
    } catch (err) {
      logger.error('Error en /voiceblacklist_add:', err);
      try {
        await interaction.editReply(
          '❌ Ocurrió un error al agregar el canal de voz a la blacklist.'
        );
      } catch (err2) {
        logger.error('Error enviando respuesta de error en /voiceblacklist_add:', err2);
      }
    }
  }
};

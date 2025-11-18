// src/commands/admin/setstreamchannel.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { setStreamAnnounceChannel } = require('../../services/guildService');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstreamchannel')
    .setDescription('Configura el canal donde se anunciarán los streams de Twitch.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal de texto para anuncios de stream')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      // ✅ Defer rápido para evitar timeout de 3s
      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      const channel = interaction.options.getChannel('canal', true);

      if (!channel.isTextBased()) {
        await interaction.editReply({
          content: '❌ El canal seleccionado debe ser un canal de texto.'
        });
        return;
      }

      await setStreamAnnounceChannel(interaction.guild.id, channel.id);

      await interaction.editReply({
        content: `✅ Canal de anuncios de streams configurado como ${channel}`
      });
    } catch (error) {
      logger.error('Error en setstreamchannel:', error);

      // Si la interacción ya expiró o es desconocida, no intentamos responder de nuevo
      if (error.code === 10062) return;

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({
            content: '❌ Ocurrió un error al configurar el canal de streams.',
            flags: MessageFlags.Ephemeral
          });
        } else {
          await interaction.reply({
            content: '❌ Ocurrió un error al configurar el canal de streams.',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (err2) {
        // Si esto también revienta, lo dejamos solo en logs
        logger.error('Error enviando respuesta de error al usuario (setstreamchannel):', err2);
      }
    }
  }
};

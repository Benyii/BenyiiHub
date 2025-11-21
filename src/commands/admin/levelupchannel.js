// src/commands/admin/levelupchannel.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const {
  setLevelUpChannel,
  clearLevelUpChannel,
  getLevelUpChannel
} = require('../../services/levelUpService');

const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelupchannel')
    .setDescription('Configura el canal donde se anunciarán las subidas de nivel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Establece el canal de anuncios de nivel.')
        .addChannelOption(opt =>
          opt
            .setName('canal')
            .setDescription('Canal de texto donde se enviarán los mensajes de subida de nivel.')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('clear')
        .setDescription('Elimina el canal de anuncios (deja de anunciar subidas de nivel).')
    )
    .addSubcommand(sub =>
      sub
        .setName('show')
        .setDescription('Muestra el canal actual de anuncios de nivel (si existe).')
    ),

  isAdmin: true,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (sub === 'set') {
        const channel = interaction.options.getChannel('canal', true);

        if (!channel.isTextBased()) {
          await interaction.reply({
            content: '❌ El canal debe ser un canal de texto.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await setLevelUpChannel(guildId, channel.id);

        await interaction.reply({
          content: `✅ Los anuncios de subida de nivel se enviarán en ${channel}.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'clear') {
        await clearLevelUpChannel(guildId);

        await interaction.reply({
          content: '✅ Se han desactivado los anuncios de subida de nivel para este servidor.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'show') {
        const channelId = await getLevelUpChannel(guildId);

        if (!channelId) {
          await interaction.reply({
            content: 'ℹ️ No hay un canal de anuncios de nivel configurado actualmente.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const channel = interaction.guild.channels.cache.get(channelId)
          || `<#${channelId}>`;

        await interaction.reply({
          content: `📢 El canal configurado para anuncios de nivel es: ${channel}`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (err) {
      logger.error('Error en /levelupchannel:', err);
      await interaction.reply({
        content: '❌ Ocurrió un error al gestionar el canal de anuncios de nivel.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

// src/commands/admin/voiceblacklist.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const {
  addBlacklistedChannel,
  removeBlacklistedChannel,
  getBlacklistedChannels
} = require('../../services/voiceBlacklistService');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voiceblacklist')
    .setDescription('Gestiona los canales de voz excluidos del sistema de actividad.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Agrega un canal de voz a la blacklist del sistema de actividad.')
      .addChannelOption(opt =>
        opt.setName('canal').setDescription('Canal de voz que no contará actividad.').setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Quita un canal de voz de la blacklist del sistema de actividad.')
      .addChannelOption(opt =>
        opt.setName('canal').setDescription('Canal de voz que volverá a contar actividad.').setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Muestra los canales de voz en la blacklist de actividad.')
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (sub === 'add') {
        const channel = interaction.options.getChannel('canal', true);
        if (!channel.isVoiceBased()) {
          await interaction.editReply('❌ El canal seleccionado debe ser un canal de voz.');
          return;
        }
        await addBlacklistedChannel(guildId, channel.id);
        await interaction.editReply(
          `✅ El canal de voz ${channel} ahora está en la blacklist de actividad.`
        );

      } else if (sub === 'remove') {
        const channel = interaction.options.getChannel('canal', true);
        if (!channel.isVoiceBased()) {
          await interaction.editReply('❌ El canal seleccionado debe ser un canal de voz.');
          return;
        }
        await removeBlacklistedChannel(guildId, channel.id);
        await interaction.editReply(
          `✅ El canal de voz ${channel} ha sido eliminado de la blacklist de actividad.`
        );

      } else if (sub === 'list') {
        const rows = await getBlacklistedChannels(guildId);
        if (!rows.length) {
          await interaction.editReply('ℹ️ No hay canales de voz en la blacklist de actividad.');
          return;
        }
        const lines = rows.map(r => {
          const ch = interaction.guild.channels.cache.get(r.channel_id);
          return ch
            ? `• ${ch} (\`${ch.id}\`)`
            : `• Canal eliminado (\`${r.channel_id}\`)`;
        });
        await interaction.editReply(
          `📵 Canales de voz en blacklist para la actividad:\n\n${lines.join('\n')}`
        );
      }
    } catch (err) {
      logger.error(`Error en /voiceblacklist ${sub}:`, err);
      try {
        await interaction.editReply('❌ Ocurrió un error ejecutando el comando.');
      } catch {
        // ignore
      }
    }
  }
};

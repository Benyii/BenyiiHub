// src/commands/admin/voiceblacklist_list.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { getBlacklistedChannels } = require('../../services/voiceBlacklistService');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voiceblacklist_list')
    .setDescription('Muestra los canales de voz en la blacklist de actividad.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  isAdmin: true,
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const rows = await getBlacklistedChannels(guildId);

      if (!rows.length) {
        await interaction.editReply('ℹ️ No hay canales de voz en la blacklist de actividad.');
        return;
      }

      const lines = rows.map(r => {
        const channel = interaction.guild.channels.cache.get(r.channel_id);
        return channel
          ? `• ${channel} (\`${channel.id}\`)`
          : `• Canal eliminado (\`${r.channel_id}\`)`;
      });

      await interaction.editReply(
        `📵 Canales de voz en blacklist para la actividad:\n\n${lines.join('\n')}`
      );
    } catch (err) {
      logger.error('Error en /voiceblacklist_list:', err);
      try {
        await interaction.editReply(
          '❌ Ocurrió un error al obtener la lista de canales en blacklist.'
        );
      } catch (err2) {
        logger.error('Error enviando respuesta de error en /voiceblacklist_list:', err2);
      }
    }
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  listRolePanelsByChannel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_listpanels')
    .setDescription('Lista los paneles de roles de un canal y sus IDs.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal a revisar (por defecto, este canal).')
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const channelOption = interaction.options.getChannel('canal');
      const targetChannel = channelOption || interaction.channel;

      if (!targetChannel.isTextBased()) {
        await interaction.editReply('❌ El canal debe ser un canal de texto.');
        return;
      }

      const panels = await listRolePanelsByChannel(guildId, targetChannel.id);

      if (!panels.length) {
        await interaction.editReply(
          `ℹ️ No hay paneles registrados en ${targetChannel}.`
        );
        return;
      }

      const lines = panels.map(p => {
        const title = p.panel_title || '(sin título)';
        const msgInfo = p.message_id
          ? `mensaje ID \`${p.message_id}\``
          : 'mensaje no enviado aún';
        return `• Panel ID \`${p.id}\` — **${title}** (${msgInfo})`;
      });

      await interaction.editReply(
        `📋 Paneles en ${targetChannel}:\n\n${lines.join('\n')}`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_listpanels:', err);
      await interaction.editReply(
        '❌ Ocurrió un error obteniendo la lista de paneles.'
      );
    }
  }
};

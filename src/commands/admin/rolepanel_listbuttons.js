const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelByGuildAndChannel,
  getButtonsByPanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_listbuttons')
    .setDescription('Muestra los botones configurados en un panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde está el panel de roles (por defecto, este canal).')
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

      const panel = await getRolePanelByGuildAndChannel(guildId, targetChannel.id);

      if (!panel) {
        await interaction.editReply(
          '❌ No hay un panel de roles configurado para ese canal. Usa `/rolepanel_setup` primero.'
        );
        return;
      }

      const buttons = await getButtonsByPanel(panel.id);

      if (!buttons.length) {
        await interaction.editReply('ℹ️ Este panel no tiene ningún botón configurado.');
        return;
      }

      const lines = buttons.map(btn => {
        const emoji = btn.emoji ? btn.emoji + ' ' : '';
        return `• ID \`${btn.id}\` → ${emoji}**${btn.label}** (rol <@&${btn.role_id}>, estilo \`${btn.style}\`)`;
      });

      await interaction.editReply(
        `📋 Botones configurados para el panel en ${targetChannel}:\n\n${lines.join('\n')}`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_listbuttons:', err);
      await interaction.editReply(
        '❌ Ocurrió un error obteniendo los botones del panel de roles.'
      );
    }
  }
};

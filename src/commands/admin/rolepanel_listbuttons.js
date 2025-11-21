const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelById,
  getButtonsByPanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_listbuttons')
    .setDescription('Muestra los botones configurados en un panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(option =>
      option
        .setName('panel_id')
        .setDescription('ID del panel (ver /rolepanel_listpanels).')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const panelId = interaction.options.getInteger('panel_id', true);
      const panel = await getRolePanelById(panelId);

      if (!panel) {
        await interaction.editReply(
          `❌ No encontré un panel con ID \`${panelId}\`.`
        );
        return;
      }

      const buttons = await getButtonsByPanel(panel.id);

      if (!buttons.length) {
        await interaction.editReply(
          `ℹ️ El panel ID \`${panel.id}\` no tiene ningún botón configurado.`
        );
        return;
      }

      const lines = buttons.map(btn => {
        const emoji = btn.emoji ? btn.emoji + ' ' : '';
        return `• ID \`${btn.id}\` → ${emoji}**${btn.label}** ` +
               `(rol <@&${btn.role_id}>, estilo \`${btn.style}\`)`;
      });

      await interaction.editReply(
        `📋 Botones configurados para el panel ID \`${panel.id}\`:\n\n${lines.join('\n')}`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_listbuttons:', err);
      await interaction.editReply(
        '❌ Ocurrió un error obteniendo los botones del panel de roles.'
      );
    }
  }
};

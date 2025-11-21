const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelById,
  getButtonByIdForPanel,
  deleteRolePanelButton,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_removebutton')
    .setDescription('Elimina un botón de un panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // REQUIRED primero
    .addIntegerOption(option =>
      option
        .setName('panel_id')
        .setDescription('ID del panel (ver /rolepanel_listpanels).')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('button_id')
        .setDescription('ID del botón a eliminar (ver /rolepanel_listbuttons).')
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

      const buttonId = interaction.options.getInteger('button_id', true);
      const button = await getButtonByIdForPanel(panel.id, buttonId);

      if (!button) {
        await interaction.editReply(
          `❌ No existe un botón con ID \`${buttonId}\` en este panel.`
        );
        return;
      }

      await deleteRolePanelButton(panel.id, buttonId);
      await sendOrUpdateRolePanel(interaction.client, panel);

      await interaction.editReply(
        `✅ Botón con ID \`${buttonId}\` eliminado correctamente del panel ID \`${panel.id}\`.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_removebutton:', err);
      await interaction.editReply(
        '❌ Ocurrió un error eliminando el botón del panel de roles.'
      );
    }
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const logger = require('../../config/logger');

const {
  getRolePanelById,
  deleteRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_removepanel')
    .setDescription('Elimina un panel de roles completo por su ID.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(option =>
      option
        .setName('panel_id')
        .setDescription('ID del panel a eliminar.')
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
          `❌ No existe un panel con ID \`${panelId}\`.`
        );
        return;
      }

      // Guardamos datos por si necesitamos borrar el mensaje
      const channelId = panel.channel_id;
      const messageId = panel.message_id;

      // Eliminamos de la DB
      await deleteRolePanel(panelId);

      // Intentamos borrar el mensaje del panel en Discord
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel && messageId) {
          const message = await channel.messages.fetch(messageId).catch(() => null);
          if (message) {
            await message.delete().catch(() => null);
          }
        }
      } catch (e) {
        // No fallamos el comando si no se puede borrar el mensaje
        logger.warn('No se pudo eliminar el mensaje del panel:', e);
      }

      await interaction.editReply(
        `✅ Panel con ID \`${panelId}\` eliminado correctamente.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_removepanel:', err);

      await interaction.editReply(
        '❌ Ocurrió un error eliminando el panel de roles.'
      );
    }
  }
};

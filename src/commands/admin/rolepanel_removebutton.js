const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelByGuildAndChannel,
  getButtonByIdForPanel,
  deleteRolePanelButton,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_removebutton')
    .setDescription('Elimina un botón de un panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde está el panel de roles (por defecto, este canal).')
        .setRequired(false)
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
        `✅ Botón con ID \`${buttonId}\` eliminado correctamente del panel en ${targetChannel}.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_removebutton:', err);
      await interaction.editReply(
        '❌ Ocurrió un error eliminando el botón del panel de roles.'
      );
    }
  }
};

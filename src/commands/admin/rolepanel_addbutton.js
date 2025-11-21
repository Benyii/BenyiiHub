const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelById,
  addRolePanelButton,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_addbutton')
    .setDescription('Agrega un botón a un panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // REQUIRED primero
    .addIntegerOption(option =>
      option
        .setName('panel_id')
        .setDescription('ID del panel (ver /rolepanel_listpanels).')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('rol')
        .setDescription('Rol que se asignará/quitará al pulsar el botón.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('texto')
        .setDescription('Texto del botón.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('estilo')
        .setDescription('Color del botón.')
        .setRequired(true)
        .addChoices(
          { name: 'Primario (azul)', value: 'primary' },
          { name: 'Secundario (gris)', value: 'secondary' },
          { name: 'Éxito (verde)', value: 'success' },
          { name: 'Peligro (rojo)', value: 'danger' }
        )
    )
    // OPCIONALES después
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('Emoji para el botón (unicode o <:custom:1234567890>).')
        .setRequired(false)
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

      const role = interaction.options.getRole('rol', true);
      const texto = interaction.options.getString('texto', true);
      const estilo = interaction.options.getString('estilo', true);
      const emoji = interaction.options.getString('emoji') || null;

      await addRolePanelButton(panel.id, role.id, texto, emoji, estilo);
      await sendOrUpdateRolePanel(interaction.client, panel);

      await interaction.editReply(
        `✅ Botón agregado para el rol ${role} con texto "**${texto}**" ` +
        `en el panel ID \`${panel.id}\`.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_addbutton:', err);
      await interaction.editReply(
        '❌ Ocurrió un error agregando el botón al panel de roles.'
      );
    }
  }
};

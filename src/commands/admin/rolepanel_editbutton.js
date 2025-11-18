const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelByGuild,
  getButtonByIdForPanel,
  updateRolePanelButton,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_editbutton')
    .setDescription('Edita las propiedades de un botón del panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(option =>
      option
        .setName('button_id')
        .setDescription('ID del botón a editar (ver /rolepanel_listbuttons)')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('rol')
        .setDescription('Nuevo rol que asignará este botón')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('texto')
        .setDescription('Nuevo texto del botón')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('estilo')
        .setDescription('Nuevo estilo/color del botón')
        .setRequired(false)
        .addChoices(
          { name: 'Primario (azul)', value: 'primary' },
          { name: 'Secundario (gris)', value: 'secondary' },
          { name: 'Éxito (verde)', value: 'success' },
          { name: 'Peligro (rojo)', value: 'danger' }
        )
    )
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('Nuevo emoji (unicode o <:custom:123>); deja vacío para no cambiarlo')
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const panel = await getRolePanelByGuild(guildId);

      if (!panel) {
        await interaction.editReply(
          '❌ No hay un panel de roles configurado. Usa primero `/rolepanel_setup`.'
        );
        return;
      }

      const buttonId = interaction.options.getInteger('button_id', true);
      const currentButton = await getButtonByIdForPanel(panel.id, buttonId);

      if (!currentButton) {
        await interaction.editReply(
          `❌ No existe un botón con ID \`${buttonId}\` en este panel.`
        );
        return;
      }

      const role = interaction.options.getRole('rol') || null;
      const texto = interaction.options.getString('texto');
      const estilo = interaction.options.getString('estilo');
      const emoji = interaction.options.getString('emoji');

      if (!role && !texto && !estilo && emoji === null) {
        await interaction.editReply(
          '❌ Debes indicar al menos un campo a editar (rol, texto, estilo o emoji).'
        );
        return;
      }

      const updatePayload = {};

      if (role) {
        updatePayload.roleId = role.id;
      }
      if (texto !== null && texto !== undefined) {
        updatePayload.label = texto;
      }
      if (estilo !== null && estilo !== undefined) {
        updatePayload.style = estilo;
      }
      if (emoji !== undefined) {
        // si emoji viene como string vacío, lo interpretamos como "sin emoji"
        updatePayload.emoji = emoji && emoji.trim().length ? emoji.trim() : null;
      }

      await updateRolePanelButton(panel.id, buttonId, updatePayload);
      await sendOrUpdateRolePanel(interaction.client, panel);

      await interaction.editReply(
        `✅ Botón con ID \`${buttonId}\` actualizado correctamente.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_editbutton:', err);
      await interaction.editReply(
        '❌ Ocurrió un error editando el botón del panel de roles.'
      );
    }
  }
};

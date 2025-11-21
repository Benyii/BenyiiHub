const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelByGuildAndChannel,
  getButtonByIdForPanel,
  updateRolePanelButton,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_editbutton')
    .setDescription('Edita un botón de un panel de roles.')
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
        .setDescription('ID del botón a editar (ver /rolepanel_listbuttons).')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('nuevo_texto')
        .setDescription('Nuevo texto del botón.')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('nuevo_estilo')
        .setDescription('Nuevo estilo/color del botón.')
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
        .setName('nuevo_emoji')
        .setDescription('Nuevo emoji del botón (unicode o <:custom:1234567890>).')
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

      const buttonId = interaction.options.getInteger('button_id', true);
      const button = await getButtonByIdForPanel(panel.id, buttonId);

      if (!button) {
        await interaction.editReply(
          `❌ No existe un botón con ID \`${buttonId}\` en este panel.`
        );
        return;
      }

      const nuevoTexto = interaction.options.getString('nuevo_texto');
      const nuevoEstilo = interaction.options.getString('nuevo_estilo');
      const nuevoEmoji = interaction.options.getString('nuevo_emoji');

      if (!nuevoTexto && !nuevoEstilo && !nuevoEmoji) {
        await interaction.editReply(
          'ℹ️ Debes indicar al menos un campo para actualizar (texto, estilo o emoji).'
        );
        return;
      }

      const fieldsToUpdate = {
        label: nuevoTexto ?? button.label,
        style: nuevoEstilo ?? button.style,
        emoji: nuevoEmoji ?? button.emoji
      };

      await updateRolePanelButton(panel.id, buttonId, fieldsToUpdate);
      await sendOrUpdateRolePanel(interaction.client, panel);

      await interaction.editReply(
        `✅ Botón con ID \`${buttonId}\` actualizado correctamente en el panel de ${targetChannel}.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_editbutton:', err);
      await interaction.editReply(
        '❌ Ocurrió un error editando el botón del panel de roles.'
      );
    }
  }
};

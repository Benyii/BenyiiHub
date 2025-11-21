const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelByGuildAndChannel,
  addRolePanelButton,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_addbutton')
    .setDescription('Agrega un botón a un panel de roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde está el panel de roles (por defecto, este canal).')
        .setRequired(false)
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

      const role = interaction.options.getRole('rol', true);
      const texto = interaction.options.getString('texto', true);
      const estilo = interaction.options.getString('estilo', true);
      const emoji = interaction.options.getString('emoji') || null;

      await addRolePanelButton(panel.id, role.id, texto, emoji, estilo);
      await sendOrUpdateRolePanel(interaction.client, panel);

      await interaction.editReply(
        `✅ Botón agregado para el rol ${role} con texto "**${texto}**" en ${targetChannel}.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_addbutton:', err);
      await interaction.editReply(
        '❌ Ocurrió un error agregando el botón al panel de roles.'
      );
    }
  }
};

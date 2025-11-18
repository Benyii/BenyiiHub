const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const { upsertRolePanel, sendOrUpdateRolePanel } = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_setup')
    .setDescription('Configura el panel de roles en un canal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde se enviará el panel.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('titulo')
        .setDescription('Título del panel (se mostrará junto al icono del servidor).')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('descripcion')
        .setDescription('Texto descriptivo que aparecerá debajo del título.')
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = interaction.options.getChannel('canal', true);
      const titulo = interaction.options.getString('titulo', true);
      const descripcion =
        interaction.options.getString('descripcion') || '';

      if (!channel.isTextBased()) {
        await interaction.editReply('❌ El canal debe ser un canal de texto.');
        return;
      }

      const guildId = interaction.guild.id;

      const panel = await upsertRolePanel(guildId, channel.id, titulo, descripcion);
      await sendOrUpdateRolePanel(client, panel);

      await interaction.editReply(
        `✅ Panel de roles configurado en ${channel} con título "**${titulo}**".`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_setup:', err);
      await interaction.editReply(
        '❌ Ocurrió un error configurando el panel de roles.'
      );
    }
  }
};

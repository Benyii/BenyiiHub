const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  createRolePanel,
  sendOrUpdateRolePanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_setup')
    .setDescription('Crea un nuevo panel de roles en un canal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    // ⚠️ Opciones requeridas primero
    .addStringOption(option =>
      option
        .setName('titulo')
        .setDescription('Título del panel (línea superior).')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('descripcion')
        .setDescription('Texto descriptivo del panel.')
        .setRequired(true)
    )
    // Opcionales después
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde se creará el panel (por defecto, este canal).')
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const titulo = interaction.options.getString('titulo', true);
      const descripcion = interaction.options.getString('descripcion', true);
      const channelOption = interaction.options.getChannel('canal');
      const targetChannel = channelOption || interaction.channel;

      if (!targetChannel.isTextBased()) {
        await interaction.editReply('❌ El canal debe ser un canal de texto.');
        return;
      }

      // Creamos un NUEVO panel independiente
      const panel = await createRolePanel(
        guildId,
        targetChannel.id,
        titulo,
        descripcion
      );

      // Envía el mensaje del panel (embed + botones, si los hubiera)
      await sendOrUpdateRolePanel(interaction.client, panel);

      await interaction.editReply(
        `✅ Panel creado en ${targetChannel} con ID \`${panel.id}\`.\n` +
        `Usa ese ID en \`/rolepanel_addbutton\`, \`/rolepanel_editbutton\`, etc.`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_setup:', err);
      await interaction.editReply(
        '❌ Ocurrió un error al crear el panel de roles.'
      );
    }
  }
};

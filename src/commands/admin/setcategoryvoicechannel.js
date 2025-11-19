const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');

const { createDynamicCategoryConfig, listDynamicConfigs } = require('../../services/dynamicVoiceService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcategoryvoicechannel')
    .setDescription('Registra una categoría como origen para canales dinámicos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt
        .setName('categoria')
        .setDescription('Categoría de voz que contendrá el canal "➕ Crear canal".')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const category = interaction.options.getChannel('categoria', true);

    const configId = await createDynamicCategoryConfig(
      interaction.guild.id,
      category.id
    );

    const configs = await listDynamicConfigs(interaction.guild.id);

    await interaction.editReply(
      `✅ Se creó la configuración **#${configId}** para la categoría \`${category.name}\` (${category.id}).\n` +
      `Configuraciones actuales:\n` +
      configs
        .map(c =>
          `• #${c.id} → origen: \`${c.source_category_id}\`, destino: \`${c.target_category_id ?? 'NULL'}\`, creador: \`${c.creator_channel_id ?? 'NULL'}\`, base: \`${c.base_name}\``
        )
        .join('\n')
    );
  }
};

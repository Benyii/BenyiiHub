const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');

const {
  setDynamicTargetCategory,
  getDynamicConfigById
} = require('../../services/dynamicVoiceService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcategorydynamicchannel')
    .setDescription('Define la categoría destino para los canales dinámicos de una configuración.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt =>
      opt
        .setName('config_id')
        .setDescription('ID de la configuración creada con /setcategoryvoicechannel.')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt
        .setName('categoria')
        .setDescription('Categoría donde se crearán los canales dinámicos.')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const configId = interaction.options.getInteger('config_id', true);
    const category = interaction.options.getChannel('categoria', true);

    const config = await getDynamicConfigById(interaction.guild.id, configId);
    if (!config) {
      return interaction.editReply(`❌ No encontré la configuración **#${configId}**.`);
    }

    await setDynamicTargetCategory(interaction.guild.id, configId, category.id);

    await interaction.editReply(
      `✅ Configuración **#${configId}** actualizada.\n` +
      `Categoría origen: \`${config.source_category_id}\`\n` +
      `Categoría destino (nueva): \`${category.name}\` (${category.id})`
    );
  }
};

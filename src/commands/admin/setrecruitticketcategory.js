const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');

const { setRecruitTicketCategory } = require('../../services/recruitmentService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrecruitticketcategory')
    .setDescription('Configura la categoría donde se crearán los tickets de reclutamiento.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt =>
      opt
        .setName('categoria')
        .setDescription('Categoría donde se crearán los tickets.')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const category = interaction.options.getChannel('categoria', true);

    await setRecruitTicketCategory(interaction.guild.id, category.id);

    await interaction.editReply(
      `✅ Categoría de tickets de reclutamiento configurada en: **${category.name}** (\`${category.id}\`).`
    );
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { setRecruitChannel } = require('../../services/recruitmentService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrecruitchannel')
    .setDescription('Configura el canal y el panel de reclutamiento.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal donde se publicará el panel de reclutamiento.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('mensaje')
        .setDescription('Mensaje descriptivo del reclutamiento.')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('canal', true);
    const description = interaction.options.getString('mensaje', true);
    const guild = interaction.guild;

    const icon = guild.iconURL({ size: 512 });

    const embed = new EmbedBuilder()
      .setTitle(`📥 Reclutamiento - ${guild.name}`)
      .setDescription(description)
      .setColor(0x5865f2)
      .setFooter({ text: 'Pulsa el botón para enviar tu postulación.' });

    if (icon) embed.setThumbnail(icon);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('recruit:apply')
        .setLabel('Postular')
        .setStyle(ButtonStyle.Primary)
    );

    const sent = await channel.send({ embeds: [embed], components: [row] });

    await setRecruitChannel(guild.id, channel.id, sent.id);

    await interaction.editReply(
      `✅ Panel de reclutamiento publicado en ${channel} (mensaje ID: \`${sent.id}\`).`
    );
  }
};

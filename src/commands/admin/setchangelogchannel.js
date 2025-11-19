const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');

const { setChangelogChannel } = require('../../services/changelogService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchangelogchannel')
    .setDescription('Establece el canal donde se publicarán los changelogs del bot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal de texto donde se enviarán las actualizaciones.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),

  // Para que tu sistema de interactionCreate lo trate como comando admin
  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('canal', true);

    if (!channel.isTextBased()) {
      return interaction.editReply('❌ El canal indicado no es un canal de texto válido.');
    }

    await setChangelogChannel(interaction.guild.id, channel.id);

    await interaction.editReply(
      `✅ Canal de changelog configurado en: ${channel} (\`${channel.id}\`).`
    );
  }
};

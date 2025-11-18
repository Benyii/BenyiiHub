const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setGoodbyeChannel } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgoodbyechannel')
    .setDescription('Establece el canal donde se enviarán las despedidas.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal donde se enviarán los mensajes de despedida.')
        .setRequired(true)
    ),
  isAdmin: true,

  async execute(interaction) {
    const channel = interaction.options.getChannel('canal', true);

    await setGoodbyeChannel(interaction.guild.id, channel.id);

    await interaction.reply({
      content: `✅ Canal de despedidas establecido en <#${channel.id}>`,
      flags: 64
    });
  }
};

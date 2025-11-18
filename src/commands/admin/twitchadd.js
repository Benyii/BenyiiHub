const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { upsertTwitchStreamer } = require('../../services/twitchTrackerService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitchadd')
    .setDescription('Agrega un canal de Twitch a la lista de seguimiento para anuncios de stream.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('canal')
        .setDescription('Nombre del canal de Twitch (login, sin https)')
        .setRequired(true)
    ),
  async execute(interaction) {
    const login = interaction.options.getString('canal', true).trim().toLowerCase();

    await upsertTwitchStreamer(interaction.guild.id, login);

    await interaction.reply({
      content: `✅ Canal de Twitch **${login}** agregado a la lista de seguimiento.`,
      ephemeral: true
    });
  }
};

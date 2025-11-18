const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeTwitchStreamer } = require('../../services/twitchTrackerService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitchremove')
    .setDescription('Elimina un canal de Twitch de la lista de seguimiento.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(option =>
      option
        .setName('canal')
        .setDescription('Nombre del canal de Twitch (login)')
        .setRequired(true)
    ),
  async execute(interaction) {
    const login = interaction.options.getString('canal', true).trim().toLowerCase();

    await removeTwitchStreamer(interaction.guild.id, login);

    await interaction.reply({
      content: `✅ Canal de Twitch **${login}** eliminado de la lista de seguimiento.`,
      ephemeral: true
    });
  }
};

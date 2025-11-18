const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setGoodbyeMessage } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setgoodbyemessage')
    .setDescription('Establece el mensaje de despedida.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt
        .setName('mensaje')
        .setDescription('Mensaje personalizado. Usa {user}, {mention}, {server}, etc.')
        .setRequired(true)
    ),
  isAdmin: true,

  async execute(interaction) {
    const msg = interaction.options.getString('mensaje', true);

    await setGoodbyeMessage(interaction.guild.id, msg);

    await interaction.reply({
      content: '✅ Mensaje de despedida configurado.',
      flags: 64
    });
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setStreamsPingRole } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstreampingrole')
    .setDescription('Configura el rol que será pingeado cuando alguien comience stream en Twitch.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(option =>
      option
        .setName('rol')
        .setDescription('Rol a pingeear para anuncios de stream')
        .setRequired(true)
    ),
  async execute(interaction) {
    const role = interaction.options.getRole('rol', true);
    await setStreamsPingRole(interaction.guild.id, role.id);

    await interaction.reply({
      content: `✅ Rol de ping de streams configurado como ${role}`,
      ephemeral: true
    });
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setNewsPingRole } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnewspingrole')
    .setDescription('Configura el rol que será pingeado para noticias.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(option =>
      option
        .setName('rol')
        .setDescription('Rol a pingeear para noticias')
        .setRequired(true)
    ),
  async execute(interaction) {
    const role = interaction.options.getRole('rol', true);
    await setNewsPingRole(interaction.guild.id, role.id);

    await interaction.reply({
      content: `✅ Rol de ping de noticias configurado como ${role}`,
      ephemeral: true
    });
  }
};

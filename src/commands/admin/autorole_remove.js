const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { removeAutoRole, getAutoRoles } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole_remove')
    .setDescription('Quita un rol del sistema de autoroles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(opt =>
      opt
        .setName('rol')
        .setDescription('Rol a quitar.')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const role = interaction.options.getRole('rol', true);

    await removeAutoRole(interaction.guild.id, role.id);

    const roles = await getAutoRoles(interaction.guild.id);

    await interaction.editReply(
      `🗑 Rol eliminado: ${role}\nRoles actuales: ${
        roles.length ? roles.map(r => `<@&${r}>`).join(', ') : 'ninguno'
      }`
    );
  }
};

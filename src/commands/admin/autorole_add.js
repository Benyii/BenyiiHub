const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { addAutoRole, getAutoRoles } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole_add')
    .setDescription('Agrega un rol que será asignado automáticamente a nuevos usuarios.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(opt =>
      opt
        .setName('rol')
        .setDescription('Rol a asignar automáticamente.')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const role = interaction.options.getRole('rol', true);

    await addAutoRole(interaction.guild.id, role.id);

    const roles = await getAutoRoles(interaction.guild.id);

    await interaction.editReply(
      `✅ Rol añadido: ${role}\nRoles actuales: ${roles.map(r => `<@&${r}>`).join(', ')}`
    );
  }
};

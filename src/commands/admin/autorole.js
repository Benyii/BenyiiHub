// src/commands/admin/autorole.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { addAutoRole, removeAutoRole, getAutoRoles } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Gestiona los roles automáticos asignados a nuevos miembros.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Agrega un rol que será asignado automáticamente a nuevos usuarios.')
      .addRoleOption(opt =>
        opt.setName('rol').setDescription('Rol a asignar automáticamente.').setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Quita un rol del sistema de autoroles.')
      .addRoleOption(opt =>
        opt.setName('rol').setDescription('Rol a quitar.').setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Lista todos los roles automáticos configurados.')
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const role = interaction.options.getRole('rol', true);
      await addAutoRole(guildId, role.id);
      const roles = await getAutoRoles(guildId);
      await interaction.editReply(
        `✅ Rol añadido: ${role}\nRoles actuales: ${roles.map(r => `<@&${r}>`).join(', ')}`
      );

    } else if (sub === 'remove') {
      const role = interaction.options.getRole('rol', true);
      await removeAutoRole(guildId, role.id);
      const roles = await getAutoRoles(guildId);
      await interaction.editReply(
        `🗑 Rol eliminado: ${role}\nRoles actuales: ${
          roles.length ? roles.map(r => `<@&${r}>`).join(', ') : 'ninguno'
        }`
      );

    } else if (sub === 'list') {
      const roles = await getAutoRoles(guildId);
      if (!roles.length) {
        return interaction.editReply('📭 No hay roles automáticos configurados.');
      }
      await interaction.editReply(
        `📌 **Roles automáticos:**\n${roles.map(r => `• <@&${r}> (\`${r}\`)`).join('\n')}`
      );
    }
  }
};

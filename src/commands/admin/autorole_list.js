const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { getAutoRoles } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole_list')
    .setDescription('Lista todos los roles automáticos configurados.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const roles = await getAutoRoles(interaction.guild.id);

    if (!roles.length) {
      return interaction.editReply('📭 No hay roles automáticos configurados.');
    }

    await interaction.editReply(
      `📌 **Roles automáticos:**\n${roles.map(r => `• <@&${r}> (\`${r}\`)`).join('\n')}`
    );
  }
};

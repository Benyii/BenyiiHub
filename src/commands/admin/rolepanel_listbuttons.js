const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const logger = require('../../config/logger');
const {
  getRolePanelByGuild,
  getButtonsByPanel
} = require('../../services/rolePanelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel_listbuttons')
    .setDescription('Muestra los botones configurados en el panel de roles actual.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const panel = await getRolePanelByGuild(guildId);

      if (!panel) {
        await interaction.editReply(
          '❌ No hay un panel de roles configurado. Usa primero `/rolepanel_setup`.'
        );
        return;
      }

      const buttons = await getButtonsByPanel(panel.id);

      if (!buttons.length) {
        await interaction.editReply(
          '📭 No hay botones configurados en el panel de roles.'
        );
        return;
      }

      const lines = buttons.map(b => {
        const emoji = b.emoji ? `${b.emoji} ` : '';
        return `• ID: \`${b.id}\` — Rol: <@&${b.role_id}> — ${emoji}**${b.label}** [${b.style}]`;
      });

      await interaction.editReply(
        `🧩 Botones configurados en el panel de roles:\n\n${lines.join('\n')}`
      );
    } catch (err) {
      logger.error('Error en /rolepanel_listbuttons:', err);
      await interaction.editReply(
        '❌ Ocurrió un error listando los botones del panel de roles.'
      );
    }
  }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { listTwitchStreamersByGuild } = require('../../services/twitchTrackerService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitchlist')
    .setDescription('Muestra los canales de Twitch configurados para anuncios.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const rows = await listTwitchStreamersByGuild(interaction.guild.id);

    if (!rows.length) {
      await interaction.reply({
        content: '📭 No hay canales de Twitch configurados para este servidor.',
        ephemeral: true
      });
      return;
    }

    const lines = rows.map(r => {
      const status = r.is_live ? '🟢 EN VIVO' : '⚫ Offline';
      return `• **${r.twitch_login}** — ${status}`;
    });

    await interaction.reply({
      content: `📺 Canales de Twitch configurados:\n${lines.join('\n')}`,
      ephemeral: true
    });
  }
};

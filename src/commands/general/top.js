const { SlashCommandBuilder, inlineCode } = require('discord.js');
const leaderboardService = require('../../services/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Muestra el top 10 de actividad del servidor'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const topUsers = await leaderboardService.getTopUsers(guildId, 10);

    if (!topUsers.length) {
      return interaction.reply({
        content: 'No hay datos todavía para el leaderboard.',
        flags: 64
      });
    }

    let description = '';
    topUsers.forEach((u, idx) => {
      const score = Math.round(u.score);
      description += `**${idx + 1}.** <@${u.user_id}> — ` +
        `${inlineCode(`Score: ${score} | Msgs: ${u.messages_count} | Voz: ${Math.round(u.voice_seconds / 60)} min | Sesiones: ${u.voice_sessions}`)}\n`;
    });

    await interaction.reply({
      embeds: [
        {
          title: '🏆 Leaderboard de actividad',
          description,
          color: 0x00aeff
        }
      ]
    });
  }
};

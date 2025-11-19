// src/commands/general/leaderboard.js
const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');

const { getTopUsers } = require('../../services/leaderboardService');
const logger = require('../../config/logger');

function formatVoice(seconds) {
  if (!seconds || seconds <= 0) return '0 min';

  const mins = Math.floor(seconds / 60);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hours > 0) {
    return `${hours} h ${remMins} min`;
  }
  return `${mins} min`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el ranking de actividad del servidor (XP, nivel, mensajes y voz).')
    .addIntegerOption(opt =>
      opt
        .setName('cantidad')
        .setDescription('Cantidad de usuarios a mostrar (1-25, por defecto 10).')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      if (!guild) {
        return interaction.reply({
          content: '❌ Este comando solo puede usarse dentro de un servidor.',
          ephemeral: true
        });
      }

      const limit = interaction.options.getInteger('cantidad') || 10;

      await interaction.deferReply();

      const rows = await getTopUsers(guild.id, limit);

      if (!rows.length) {
        return interaction.editReply('📭 No hay datos de actividad aún para este servidor.');
      }

      const lines = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        let userTag = `ID: ${row.user_id}`;
        try {
          const user = await interaction.client.users.fetch(row.user_id);
          if (user) userTag = `${user.tag}`;
        } catch (e) {
          // ignorar error de fetch, usamos el ID
        }

        const place = i + 1;
        let placeEmoji = `#${place}`;
        if (place === 1) placeEmoji = '🥇';
        else if (place === 2) placeEmoji = '🥈';
        else if (place === 3) placeEmoji = '🥉';

        const msgs = row.messages_count ?? 0;
        const voiceSecs = row.voice_seconds ?? 0;
        const voiceNice = formatVoice(voiceSecs);
        const sessions = row.voice_sessions ?? 0;
        const xp = row.xp ?? 0;
        const lvl = row.lvl ?? 1;
        const days = row.days_in_guild;

        const daysText =
          days == null
            ? 'N/D'
            : days === 0
              ? 'menos de 1 día'
              : `${days} día${days === 1 ? '' : 's'}`;

        lines.push(
          `${placeEmoji} **${userTag}**` +
          `\n• Nivel: \`${lvl}\` | XP: \`${xp}\`` +
          `\n• Mensajes: \`${msgs}\` | Voz: \`${voiceNice}\` (${sessions} sesión${sessions === 1 ? '' : 'es'})` +
          `\n• Tiempo en el servidor: ${daysText}\n`
        );
      }

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Leaderboard de ${guild.name}`)
        .setDescription(lines.join('\n'))
        .setColor(0xF1C40F)
        .setTimestamp(new Date());

      if (guild.iconURL()) {
        embed.setThumbnail(guild.iconURL({ size: 256 }));
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error en comando /leaderboard:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Ocurrió un error al generar el leaderboard.');
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error al generar el leaderboard.',
          ephemeral: true
        });
      }
    }
  }
};

// src/commands/admin/twitch.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const logger = require('../../config/logger');
const {
  upsertTwitchStreamer,
  removeTwitchStreamer,
  listTwitchStreamersByGuild
} = require('../../services/twitchTrackerService');
const { getStreamsByLogins, getUserById } = require('../../services/twitchApiService');
const {
  getStreamsPingRole,
  getGuildLogChannel,
  getStreamAnnounceChannel
} = require('../../services/guildService');

function buildThumbnailUrl(template) {
  if (!template) return null;
  return template.replace('{width}', '1280').replace('{height}', '720');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('twitch')
    .setDescription('Gestiona los canales de Twitch para anuncios de stream.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Agrega un canal de Twitch a la lista de seguimiento para anuncios de stream.')
      .addStringOption(opt =>
        opt.setName('canal').setDescription('Nombre del canal de Twitch (login, sin https)').setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Elimina un canal de Twitch de la lista de seguimiento.')
      .addStringOption(opt =>
        opt.setName('canal').setDescription('Nombre del canal de Twitch (login)').setRequired(true)
      )
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Muestra los canales de Twitch configurados para anuncios.')
    )
    .addSubcommand(sub => sub
      .setName('test')
      .setDescription('Reenvía manualmente las alertas de en vivo de los canales configurados (debug).')
      .addStringOption(opt =>
        opt.setName('canal').setDescription('Canal de Twitch específico a testear (opcional)').setRequired(false)
      )
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      if (sub === 'add') {
        const login = interaction.options.getString('canal', true).trim().toLowerCase();
        await upsertTwitchStreamer(guildId, login);
        await interaction.editReply(
          `✅ Canal de Twitch **${login}** agregado a la lista de seguimiento.`
        );

      } else if (sub === 'remove') {
        const login = interaction.options.getString('canal', true).trim().toLowerCase();
        await removeTwitchStreamer(guildId, login);
        await interaction.editReply(
          `✅ Canal de Twitch **${login}** eliminado de la lista de seguimiento.`
        );

      } else if (sub === 'list') {
        const rows = await listTwitchStreamersByGuild(guildId);
        if (!rows.length) {
          await interaction.editReply('📭 No hay canales de Twitch configurados para este servidor.');
          return;
        }
        const lines = rows.map(r =>
          `• **${r.twitch_login}** — ${r.is_live ? '🟢 EN VIVO' : '⚫ Offline'}`
        );
        await interaction.editReply(`📺 Canales de Twitch configurados:\n${lines.join('\n')}`);

      } else if (sub === 'test') {
        const guild = interaction.guild;

        let announceChannelId = await getStreamAnnounceChannel(guildId);
        if (!announceChannelId) announceChannelId = await getGuildLogChannel(guildId);

        if (!announceChannelId) {
          await interaction.editReply(
            '❌ Este servidor no tiene configurado un canal de anuncios de streams ni canal de logs.'
          );
          return;
        }

        const announceChannel = guild.channels.cache.get(announceChannelId);
        if (!announceChannel || !announceChannel.isTextBased()) {
          await interaction.editReply(
            '❌ El canal configurado para anuncios de streams no es válido o no es de texto.'
          );
          return;
        }

        const specificLogin = interaction.options.getString('canal')?.trim().toLowerCase() || null;
        const rows = await listTwitchStreamersByGuild(guildId);
        if (!rows.length) {
          await interaction.editReply('📭 No hay canales de Twitch configurados en este servidor.');
          return;
        }

        const filteredRows = specificLogin
          ? rows.filter(r => r.twitch_login.toLowerCase() === specificLogin)
          : rows;

        if (!filteredRows.length) {
          await interaction.editReply(
            `📭 El canal **${specificLogin}** no está configurado para este servidor.`
          );
          return;
        }

        const logins = filteredRows.map(r => r.twitch_login.toLowerCase());
        const streamsMap = await getStreamsByLogins(logins);
        const streamsPingRoleId = await getStreamsPingRole(guildId);
        const pingRoleMention = streamsPingRoleId ? `<@&${streamsPingRoleId}>` : '';

        let sentCount = 0;
        let offlineCount = 0;

        for (const row of filteredRows) {
          const login = row.twitch_login.toLowerCase();
          const stream = streamsMap.get(login) || null;

          if (!stream) { offlineCount++; continue; }

          const twitchUrl = `https://twitch.tv/${stream.user_login}`;
          const streamTitle = stream.title || 'Stream en directo';
          const gameName = stream.game_name || 'Categoría desconocida';
          const viewerCount = stream.viewer_count ?? 0;

          const userInfo = await getUserById(stream.user_id);
          const profileImage = userInfo?.profile_image_url || null;
          const thumbnailUrl = buildThumbnailUrl(stream.thumbnail_url);

          const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setURL(twitchUrl)
            .setAuthor({ name: stream.user_name, url: twitchUrl, iconURL: profileImage || undefined })
            .setTitle(streamTitle)
            .setDescription(
              `🎮 **Juego:** ${gameName}\n` +
              `👀 **Espectadores:** ${viewerCount}\n\n` +
              `🔗 ${twitchUrl}`
            )
            .setTimestamp(new Date())
            .setFooter({ text: 'Twitch • En directo ahora (TEST)' });

          if (profileImage) embed.setThumbnail(profileImage);
          if (thumbnailUrl) embed.setImage(thumbnailUrl);

          const content = (
            `🎉**${stream.user_name}** 🎉 está en directo: **${streamTitle}** - ` +
            `**Jugando**: ${gameName}, ¿qué esperas para saludar un rato? ${pingRoleMention}`
          ).trim();

          try {
            await announceChannel.send({ content, embeds: [embed] });
            sentCount++;
          } catch (err) {
            logger.error(
              `Error enviando alerta de prueba de Twitch para ${login} en guild ${guildId}:`, err
            );
          }
        }

        await interaction.editReply(
          `✅ Test de alertas completado.\n\n` +
          `• Alertas enviadas: **${sentCount}**\n` +
          `• Canales sin stream en vivo: **${offlineCount}**`
        );
      }
    } catch (err) {
      logger.error(`Error en /twitch ${sub}:`, err);
      try {
        await interaction.editReply('❌ Ocurrió un error ejecutando el comando. Revisa los logs del bot.');
      } catch {
        // ignore
      }
    }
  }
};

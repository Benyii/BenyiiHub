// src/services/twitchWatcher.js
const { EmbedBuilder } = require('discord.js');
const logger = require('../config/logger');
const {
  getAllTrackedStreamers,
  updateStreamerLiveState
} = require('./twitchTrackerService');
const { getStreamsByLogins, getUserById } = require('./twitchApiService');
const {
  getStreamsPingRole,
  getGuildLogChannel,
  getStreamAnnounceChannel
} = require('./guildService');

/**
 * Devuelve la URL final del thumbnail del stream (con tamaño fijo).
 */
function buildThumbnailUrl(template) {
  if (!template) return null;
  return template
    .replace('{width}', '1280')
    .replace('{height}', '720');
}

/**
 * Revisa el estado de todos los streamers trackeados
 * y dispara anuncios cuando alguno pasa de offline → online.
 */
async function checkTwitchStreams(client) {
  try {
    const rows = await getAllTrackedStreamers();
    if (!rows.length) return;

    const logins = rows.map(r => r.twitch_login.toLowerCase());
    const streamsMap = await getStreamsByLogins(logins);

    for (const row of rows) {
      const login = row.twitch_login.toLowerCase();
      const stream = streamsMap.get(login) || null;

      const wasLive = !!row.is_live;
      const nowLive = !!stream;

      // Cambio OFF -> ON
      if (!wasLive && nowLive && stream) {
        const guild = client.guilds.cache.get(row.guild_id);
        if (!guild) {
          await updateStreamerLiveState(row.id, { isLive: false, streamId: null });
          continue;
        }

        // Canal específico para anuncios de streaming
        let announceChannelId = await getStreamAnnounceChannel(row.guild_id);

        // Si no hay, fallback al log_channel
        if (!announceChannelId) {
          announceChannelId = await getGuildLogChannel(row.guild_id);
        }

        if (!announceChannelId) {
          logger.warn(
            `Guild ${row.guild_id} no tiene stream_announce_channel_id ni log_channel_id configurados para anuncios de Twitch.`
          );
          await updateStreamerLiveState(row.id, {
            isLive: true,
            streamId: stream.id,
            displayName: stream.user_name,
            userId: stream.user_id
          });
          continue;
        }

        const channel = guild.channels.cache.get(announceChannelId);
        if (!channel || !channel.isTextBased()) {
          logger.warn(
            `Canal ${announceChannelId} inválido para anuncios Twitch en guild ${row.guild_id}.`
          );
          await updateStreamerLiveState(row.id, {
            isLive: true,
            streamId: stream.id,
            displayName: stream.user_name,
            userId: stream.user_id
          });
          continue;
        }

        const streamsPingRoleId = await getStreamsPingRole(row.guild_id);
        const pingRoleMention = streamsPingRoleId ? `<@&${streamsPingRoleId}>` : '';

        const twitchUrl = `https://twitch.tv/${stream.user_login}`;
        const streamTitle = stream.title || 'Stream en directo';
        const gameName = stream.game_name || 'Categoría desconocida';
        const viewerCount = stream.viewer_count ?? 0;

        // Datos de usuario para la foto de perfil
        const userInfo = await getUserById(stream.user_id);
        const profileImage = userInfo?.profile_image_url || null;

        const thumbnailUrl = buildThumbnailUrl(stream.thumbnail_url);

        // 🟣 Embed estilo Twitch
        const embed = new EmbedBuilder()
          .setColor(0x9146FF) // morado Twitch
          .setURL(twitchUrl)
          .setAuthor({
            name: stream.user_name,
            url: twitchUrl,
            iconURL: profileImage || undefined // 👈 fotito circular al lado del título
          })
          .setTitle(streamTitle)
          .setDescription(
            `🎮 **Juego:** ${gameName}\n` +
            `👀 **Espectadores:** ${viewerCount}\n\n` +
            `🔗 ${twitchUrl}`
          )
          .setTimestamp(new Date())
          .setFooter({ text: 'Twitch • En directo ahora' });

        // Foto del canal de Twitch como thumbnail (esquina superior derecha)
        if (profileImage) {
          embed.setThumbnail(profileImage);
        }

        // Imagen grande del directo
        if (thumbnailUrl) {
          embed.setImage(thumbnailUrl);
        }

        // ✅ Texto arriba del embed con el formato pedido
        const content =
          `🎉 **${stream.user_name}** 🎉 está en directo: **${streamTitle}** - ` +
          `**Jugando**: ${gameName}, ¿qué esperas para saludar un rato? ${pingRoleMention}`.trim();

        try {
          await channel.send({
            content,
            embeds: [embed]
          });
        } catch (err) {
          logger.error(
            `Error enviando anuncio de Twitch para ${login} en guild ${row.guild_id}:`,
            err
          );
        }

        // Marcamos como EN VIVO en la DB
        await updateStreamerLiveState(row.id, {
          isLive: true,
          streamId: stream.id,
          displayName: stream.user_name,
          userId: stream.user_id
        });
      }

      // ON -> OFF
      if (wasLive && !nowLive) {
        await updateStreamerLiveState(row.id, {
          isLive: false,
          streamId: null
        });
      }
    }
  } catch (err) {
    logger.error('Error general en checkTwitchStreams:', err);
  }
}

/**
 * Arranca el intervalo del watcher.
 */
function startTwitchWatcher(client) {
  const intervalSec = Number(process.env.TWITCH_POLL_INTERVAL || '60');
  const ms = Math.max(intervalSec, 20) * 1000; // mínimo 20s

  logger.info(`Iniciando watcher de Twitch cada ${ms / 1000}s...`);

  setInterval(() => {
    checkTwitchStreams(client);
  }, ms);
}

module.exports = {
  startTwitchWatcher
};

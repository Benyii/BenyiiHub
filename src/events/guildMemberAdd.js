// src/events/guildMemberAdd.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { getWelcomeBoostSettings } = require('../services/guildService');
const { generateWelcomeImage } = require('../services/welcomeImageService');
const logger = require('../config/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const guild = member.guild;
      if (!guild) return;

      const guildId = guild.id;
      const user = member.user;

      const createdTs = Math.floor(user.createdTimestamp / 1000);
      const joinedTs = Math.floor(member.joinedTimestamp / 1000);

      const description =
        `👤 **Nuevo miembro en el servidor**\n` +
        `Usuario: ${user.tag} (${user.id})\n` +
        `Nombre actual: \`${user.username}\`\n` +
        `Es bot: ${user.bot ? 'Sí' : 'No'}\n\n` +
        `📅 **Fechas**\n` +
        `Cuenta creada: <t:${createdTs}:F> (<t:${createdTs}:R>)\n` +
        `Se unió al servidor: <t:${joinedTs}:F> (<t:${joinedTs}:R>)`;

      // 🔹 Log administrativo (lo que ya tenías)
      await sendAdminEventLog(client, guildId, {
        title: 'Nuevo miembro ingresó al servidor',
        description
      });

      // 🔹 Mensaje de bienvenida con imagen personalizada
      const settings = await getWelcomeBoostSettings(guildId);

      if (
        settings &&
        settings.welcome_enabled &&
        settings.welcome_channel_id
      ) {
        const channel = guild.channels.cache.get(
          settings.welcome_channel_id
        );

        if (channel && channel.isTextBased()) {
          const attachment = await generateWelcomeImage(member);
          const content = `🎉 ¡Bienvenido/a ${member} al servidor!`;

          if (attachment) {
            await channel.send({
              content,
              files: [attachment]
            });
          } else {
            // fallback si falla la generación de imagen
            await channel.send({ content });
          }
        }
      }
    } catch (err) {
      logger.error('Error en guildMemberAdd event:', err);
    }
  }
};

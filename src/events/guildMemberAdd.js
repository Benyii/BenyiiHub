// src/events/guildMemberAdd.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { getWelcomeBoostSettings } = require('../services/guildService');
const { generateWelcomeImage } = require('../services/welcomeImageService');
const { applyWelcomeTemplate } = require('../utils/welcomeTemplate');
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

      // Log administrativo
      await sendAdminEventLog(client, guildId, {
        title: 'Nuevo miembro ingresó al servidor',
        description
      });

      // Config welcome / boost
      const settings = await getWelcomeBoostSettings(guildId);

      if (
        !settings ||
        !settings.welcome_enabled ||
        !settings.welcome_channel_id
      ) {
        return;
      }

      const channel = guild.channels.cache.get(settings.welcome_channel_id);
      if (!channel || !channel.isTextBased()) return;

      const shortName = settings.short_guild_name || guild.name;

      // Plantilla de mensaje (custom o fallback)
      const template =
        settings.welcome_custom_message ||
        '🎉 {mention}, ¡bienvenido/a al servidor {server}! Actualmente somos {membercount} miembros.';

      const content = applyWelcomeTemplate(template, {
        member,
        guild,
        shortName
      });

      const attachment = await generateWelcomeImage(member, shortName);

      if (attachment) {
        await channel.send({
          content,
          files: [attachment]
        });
      } else {
        await channel.send({ content });
      }

      // ===========================================
      //      ASIGNAR ROLES AUTOMÁTICOS
      // ===========================================
      try {
        const roles = await getAutoRoles(guild.id);

        for (const roleId of roles) {
          const role = guild.roles.cache.get(roleId);

          if (!role) continue;

          await member.roles.add(role).catch(() => {});
        }
      } catch (err) {
        logger.error('Error asignando roles automáticos:', err);
      }
    } catch (err) {
      logger.error('Error en guildMemberAdd event:', err);
    }
  }
};

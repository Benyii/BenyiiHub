// src/events/userUpdate.js
//
// Cambios de perfil GLOBAL del usuario (no dependen de un servidor):
//   - foto de perfil (avatar)
//   - nombre visible / global (globalName)
//   - nombre de usuario / @handle (username)
//
// Cada tipo se registra en un mensaje separado, en el canal de user event log
// de cada servidor que el bot comparte con ese usuario.
// El apodo por servidor (nickname) y el avatar por servidor se registran aparte
// en guildMemberUpdate.js.

const { sendUserEventLog } = require('../services/userEventLogService');
const logger = require('../config/logger');

module.exports = {
  name: 'userUpdate',
  async execute(oldUser, newUser, client) {
    try {
      // Si el usuario cacheado era parcial no podemos diferenciar de forma fiable.
      if (oldUser.partial) return;

      const changedAvatar = oldUser.avatar !== newUser.avatar;
      const changedGlobalName = (oldUser.globalName ?? null) !== (newUser.globalName ?? null);
      const changedUsername = oldUser.username !== newUser.username;

      if (!changedAvatar && !changedGlobalName && !changedUsername) return;

      // Servidores donde el bot ve a este usuario
      const guilds = client.guilds.cache.filter(g => g.members.cache.has(newUser.id));
      if (!guilds.size) return;

      const userTag = `${newUser.tag} (${newUser.id})`;
      const nowTs = Math.floor(Date.now() / 1000);

      for (const guild of guilds.values()) {
        const guildId = guild.id;

        if (changedAvatar) {
          await sendUserEventLog(client, guildId, {
            title: 'Cambio de foto de perfil',
            description:
              `🖼️ **Cambio de foto de perfil**\n` +
              `Usuario: ${userTag}\n` +
              `Hora: <t:${nowTs}:F>`,
            imageUrl: newUser.displayAvatarURL({ size: 256 })
          });
        }

        if (changedGlobalName) {
          await sendUserEventLog(client, guildId, {
            title: 'Cambio de nombre visible',
            description:
              `🏷️ **Cambio de nombre visible (global)**\n` +
              `Usuario: ${userTag}\n` +
              `Antes: \`${oldUser.globalName || '(sin nombre visible)'}\`\n` +
              `Después: \`${newUser.globalName || '(sin nombre visible)'}\`\n` +
              `Hora: <t:${nowTs}:F>`
          });
        }

        if (changedUsername) {
          await sendUserEventLog(client, guildId, {
            title: 'Cambio de nombre de usuario',
            description:
              `🔤 **Cambio de nombre de usuario (@username)**\n` +
              `Usuario: ${userTag}\n` +
              `Antes: \`@${oldUser.username}\`\n` +
              `Después: \`@${newUser.username}\`\n` +
              `Hora: <t:${nowTs}:F>`
          });
        }
      }
    } catch (err) {
      logger.error('Error en userUpdate event:', err);
    }
  }
};

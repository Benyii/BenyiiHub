// src/events/messageCreate.js
const leaderboardService = require('../services/leaderboardService');
const {
  EASTER_EGG_MESSAGES,
  EASTER_EGG_COOLDOWN_MS
} = require('../config/easterEggMessages');

// Mapa en memoria para cooldown por usuario en DM
const dmCooldownMap = new Map();

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Ignorar mensajes de bots
    if (message.author.bot) return;

    console.log('Llego mensaje:', {
      guild: !!message.guild,
      author: message.author.tag,
      content: message.content
    });

    /* =========================================
     * 1) Easter Egg en DMs (mensajes privados)
     * ========================================= */
    if (!message.guild) {
      const userId = message.author.id;
      const now = Date.now();
      const lastTime = dmCooldownMap.get(userId) || 0;

      // Cooldown activo → no responder
      if (now - lastTime < EASTER_EGG_COOLDOWN_MS) {
        return;
      }

      dmCooldownMap.set(userId, now);

      // Elegir frase aleatoria
      const randomIndex = Math.floor(Math.random() * EASTER_EGG_MESSAGES.length);
      const template = EASTER_EGG_MESSAGES[randomIndex] || 'Hola {user}';

      const text = template.replace('{user}', `<@${userId}>`);

      try {
        await message.channel.send(text);
      } catch (e) {
        // Si el usuario tiene DMs cerrados, no crashear el bot
      }

      return; // importante
    }

    /* =========================================
     * 2) Lógica normal dentro de servidores
     * ========================================= */

    await leaderboardService.incrementMessageCount(
      message.client,
      message.guild.id,
      message.author.id
    );
  }
};

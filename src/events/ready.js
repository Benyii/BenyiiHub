// src/events/ready.js
const logger = require('../config/logger');
const { syncGuilds } = require('../services/guildService');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Bot iniciado como ${client.user.tag}`);
    logger.info(`Actualmente en ${client.guilds.cache.size} servidores.`);

    // Sincronizar los servidores con la base de datos
    await syncGuilds(client);
  }
};

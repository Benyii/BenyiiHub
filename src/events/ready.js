const logger = require('../config/logger');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`Bot iniciado como ${client.user.tag}`);
  }
};

require('dotenv').config();

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildIdDev: process.env.GUILD_ID_DEV
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'discord_bot'
  },
  logs: {
    level: process.env.LOG_LEVEL || 'info',
    logChannelId: process.env.LOG_CHANNEL_ID || null
  },
  jtc: {
    channelId: process.env.JTC_CHANNEL_ID || null,
    categoryId: process.env.JTC_CATEGORY_ID || null,
    userLimit: parseInt(process.env.JTC_USER_LIMIT || '4', 10)
  }
};

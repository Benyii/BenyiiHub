const leaderboardService = require('../services/leaderboardService');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    await leaderboardService.incrementMessageCount(message.guild.id, message.author.id);
  }
};

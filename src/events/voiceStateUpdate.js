const leaderboardService = require('../services/leaderboardService');
const voiceChannelService = require('../services/voiceChannelService');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const guildId = (oldState.guild || newState.guild)?.id;
    const userId = (oldState.id || newState.id);

    // manejo de leaderboard (tiempo en voz)
    const joinedVoice = !oldState.channelId && newState.channelId;
    const leftVoice = oldState.channelId && !newState.channelId;

    if (guildId && userId) {
      if (joinedVoice) {
        await leaderboardService.registerVoiceJoin(guildId, userId);
      } else if (leftVoice) {
        await leaderboardService.registerVoiceLeave(guildId, userId);
      }
    }

    // manejo de canales dinámicos (join to create)
    await voiceChannelService.createUserChannelIfNeeded(oldState, newState);
    await voiceChannelService.deleteUserChannelIfEmpty(oldState, newState);
  }
};

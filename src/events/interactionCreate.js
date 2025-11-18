const logger = require('../config/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('Error ejecutando comando:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Hubo un error ejecutando este comando.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Hubo un error ejecutando este comando.', ephemeral: true });
      }
    }
  }
};

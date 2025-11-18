// src/events/interactionCreate.js
const logger = require('../config/logger');
const { sendErrorLogToGuild } = require('../services/logChannelService');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
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

      // Respuesta al usuario
      try {
        const replyPayload = {
          content: '❌ Hubo un error ejecutando este comando. El incidente ha sido registrado.',
          flags: 64 // equivalente a EPHEMERAL
        };

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(replyPayload);
        } else {
          await interaction.reply(replyPayload);
        }
      } catch (replyError) {
        logger.error('Error enviando respuesta de error al usuario:', replyError);
      }

      // Log en el canal de logs del servidor (si hay)
      if (interaction.guild) {
        const guildId = interaction.guild.id;
        const user = interaction.user;

        let description =
          `Comando: \`/${interaction.commandName}\`\n` +
          `Usuario: ${user.tag} (${user.id})\n`;

        if (interaction.channel) {
          description += `Canal: <#${interaction.channel.id}> (${interaction.channel.id})\n`;
        }

        description += 'Se ha producido una excepción durante la ejecución del comando.';

        await sendErrorLogToGuild(client, guildId, {
          title: 'Error ejecutando comando',
          description,
          error
        });
      }
    }
  }
};

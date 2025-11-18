// src/events/interactionCreate.js
const { MessageFlags } = require('discord.js');
const logger = require('../config/logger');
const { sendErrorLogToGuild } = require('../services/logChannelService');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Solo slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    try {
      // 👈 importante pasar también el client por si los comandos lo usan
      await command.execute(interaction, client);
    } catch (error) {
      logger.error('Error ejecutando comando:', error);

      // Si la interacción ya no existe / expiró, no intentamos responder
      if (error.code !== 10062) {
        // Respuesta al usuario (ephemeral usando flags)
        try {
          const replyPayload = {
            content:
              '❌ Hubo un error ejecutando este comando. El incidente ha sido registrado.',
            flags: MessageFlags.Ephemeral
          };

          if (interaction.deferred || interaction.replied) {
            await interaction.followUp(replyPayload);
          } else {
            await interaction.reply(replyPayload);
          }
        } catch (replyError) {
          // Si aquí también da 10062, simplemente lo logueamos y seguimos
          if (replyError.code !== 10062) {
            logger.error(
              'Error enviando respuesta de error al usuario:',
              replyError
            );
          }
        }
      } else {
        logger.warn(
          `Interacción desconocida/expirada al ejecutar /${interaction.commandName} (code 10062)`
        );
      }

      // Log en el canal de logs del servidor (si hay)
      if (interaction.guild) {
        try {
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
        } catch (logError) {
          logger.error('Error enviando log de error al canal de logs:', logError);
        }
      }
    }
  }
};

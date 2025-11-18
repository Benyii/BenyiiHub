// src/events/interactionCreate.js
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
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

    // 🔒 Validación extra para comandos de carpeta "admin"
    if (command.isAdmin) {
      const member = interaction.member;

      // Si por alguna razón no tenemos member (DM, etc.), bloquear igual
      if (!member || !member.permissions?.has(PermissionFlagsBits.Administrator)) {
        try {
          await interaction.reply({
            content: '❌ No tienes permisos para usar este comando de administración.',
            flags: MessageFlags.Ephemeral
          });
        } catch (permErr) {
          logger.error('Error respondiendo falta de permisos:', permErr);
        }
        return;
      }
    }

    try {
      // Pasamos también client por si el comando lo necesita
      await command.execute(interaction, client);
    } catch (error) {
      logger.error('Error ejecutando comando:', error);

      // Si la interacción ya expiró / es desconocida, no intentamos responder de nuevo
      if (error.code !== 10062) {
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
          if (replyError.code !== 10062) {
            logger.error('Error enviando respuesta de error al usuario:', replyError);
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

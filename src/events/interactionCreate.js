// src/events/interactionCreate.js
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const logger = require('../config/logger');
const { sendErrorLogToGuild } = require('../services/logChannelService');
const { handleRolePanelButton } = require('../services/rolePanelService');

// Parsear SUPERADMIN del .env una sola vez
const superAdminIds = (process.env.SUPERADMIN || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 🟢 Botones del panel de roles
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('rolepanel:')) {
        await handleRolePanelButton(interaction);
      }
      return;
    }

    // 🟣 Solo slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    // 🛡️ Validación de admin (incluye SUPERADMIN override)
    if (command.isAdmin) {
      const userId = interaction.user.id;

      // Si hay SUPERADMIN definido, SOLO esos IDs pueden usar comandos admin
      if (superAdminIds.length > 0) {
        if (!superAdminIds.includes(userId)) {
          try {
            await interaction.reply({
              content:
                '❌ No tienes permisos para usar este comando de administración.',
              flags: MessageFlags.Ephemeral
            });
          } catch (permErr) {
            if (permErr.code !== 10062) {
              logger.error('Error respondiendo falta de permisos (SUPERADMIN):', permErr);
            }
          }
          return;
        }
      } else {
        // Si NO hay SUPERADMIN, se usa el sistema anterior: solo Administrador
        if (!interaction.guild) {
          try {
            await interaction.reply({
              content:
                '❌ Este comando de administración solo puede usarse dentro de un servidor.',
              flags: MessageFlags.Ephemeral
            });
          } catch (permErr) {
            if (permErr.code !== 10062) {
              logger.error('Error respondiendo falta de permisos (sin guild):', permErr);
            }
          }
          return;
        }

        const member = interaction.member;

        if (
          !member ||
          !member.permissions?.has(PermissionFlagsBits.Administrator)
        ) {
          try {
            await interaction.reply({
              content:
                '❌ No tienes permisos para usar este comando de administración.',
              flags: MessageFlags.Ephemeral
            });
          } catch (permErr) {
            if (permErr.code !== 10062) {
              logger.error('Error respondiendo falta de permisos (permisos Discord):', permErr);
            }
          }
          return;
        }
      }
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      logger.error('Error ejecutando comando:', error);

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

      // Log al canal de logs, si aplica
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

          description +=
            'Se ha producido una excepción durante la ejecución del comando.';

          await sendErrorLogToGuild(client, guildId, {
            title: 'Error ejecutando comando',
            description,
            error
          });
        } catch (logError) {
          logger.error(
            'Error enviando log de error al canal de logs:',
            logError
          );
        }
      }
    }
  }
};

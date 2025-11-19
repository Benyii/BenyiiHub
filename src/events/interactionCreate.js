// src/events/interactionCreate.js
const {
  MessageFlags,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder
} = require('discord.js');

const logger = require('../config/logger');
const { sendErrorLogToGuild } = require('../services/logChannelService');
const { handleRolePanelButton } = require('../services/rolePanelService');

const {
  getRecruitSettings,
  createApplication,
  linkApplicationTicket
} = require('../services/recruitmentService');

// SUPERADMIN ids desde .env (para comandos en carpeta admin)
const superAdminIds = (process.env.SUPERADMIN || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

// Roles staff que verán los tickets de reclutamiento
const ticketStaffRoles = (process.env.TICKET_STAFF_ROLES || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // 🟢 Botones
    if (interaction.isButton()) {
      // Panel de roles
      if (interaction.customId.startsWith('rolepanel:')) {
        await handleRolePanelButton(interaction);
        return;
      }

      // Botón del panel de reclutamiento
      if (interaction.customId === 'recruit:apply') {
        const modal = new ModalBuilder()
          .setCustomId('recruit:applyModal')
          .setTitle('Postulación a reclutamiento');

        const inputName = new TextInputBuilder()
          .setCustomId('delta_name')
          .setLabel('Nombre Delta Force')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100);

        const inputUid = new TextInputBuilder()
          .setCustomId('delta_uid')
          .setLabel('UID Delta Force')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100);

        const inputCountry = new TextInputBuilder()
          .setCustomId('country')
          .setLabel('País')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100);

        const inputSchedule = new TextInputBuilder()
          .setCustomId('schedule')
          .setLabel('Horario de conexión')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(255);

        const rows = [
          new ActionRowBuilder().addComponents(inputName),
          new ActionRowBuilder().addComponents(inputUid),
          new ActionRowBuilder().addComponents(inputCountry),
          new ActionRowBuilder().addComponents(inputSchedule)
        ];

        modal.addComponents(...rows);

        await interaction.showModal(modal);
        return;
      }

      return;
    }

    // 🟣 Modales
    if (interaction.isModalSubmit()) {
      // Modal de postulación de reclutamiento
      if (interaction.customId === 'recruit:applyModal') {
        const guild = interaction.guild;
        if (!guild) {
          await interaction.reply({
            content: '❌ Este formulario solo puede usarse dentro de un servidor.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const settings = await getRecruitSettings(guild.id);
        if (!settings || !settings.ticket_category_id) {
          await interaction.reply({
            content:
              '❌ El sistema de reclutamiento no está completamente configurado. ' +
              'Un administrador debe usar `/setrecruitticketcategory`.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const deltaName = interaction.fields.getTextInputValue('delta_name');
        const deltaUid = interaction.fields.getTextInputValue('delta_uid');
        const country = interaction.fields.getTextInputValue('country');
        const schedule = interaction.fields.getTextInputValue('schedule');

        // 1) Crear postulación en BD con estado "pending"
        const applicationId = await createApplication({
          guildId: guild.id,
          userId: interaction.user.id,
          deltaName,
          deltaUid,
          country,
          schedule
        });

        // 2) Crear canal de ticket con permisos
        const category = guild.channels.cache.get(settings.ticket_category_id);
        if (!category || category.type !== ChannelType.GuildCategory) {
          await interaction.reply({
            content:
              '❌ La categoría de tickets configurada ya no existe o no es válida. ' +
              'Contacta a un administrador.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const baseName = 'reclutamiento';
        const safeUser = interaction.user.username
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase();
        const channelName = `${baseName}-${safeUser}`.slice(0, 90);

        const overwrites = [];

        // Denegar @everyone
        overwrites.push({
          id: guild.roles.everyone.id,
          deny: ['ViewChannel']
        });

        // Permisos del postulante
        overwrites.push({
          id: interaction.user.id,
          allow: [
            'ViewChannel',
            'SendMessages',
            'ReadMessageHistory',
            'AttachFiles',
            'EmbedLinks'
          ]
        });

        // Permisos de roles staff desde .env
        for (const roleId of ticketStaffRoles) {
          const role = guild.roles.cache.get(roleId);
          if (!role) continue;
          overwrites.push({
            id: role.id,
            allow: [
              'ViewChannel',
              'SendMessages',
              'ReadMessageHistory',
              'AttachFiles',
              'EmbedLinks',
              'ManageMessages'
            ]
          });
        }

        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites
        });

        // 3) Vincular canal de ticket a la postulación
        await linkApplicationTicket(applicationId, ticketChannel.id);

        // 4) Embed con datos
        const appEmbed = new EmbedBuilder()
          .setTitle('📥 Nueva postulación de reclutamiento')
          .setColor(0x3498db)
          .setDescription(
            `**Postulante:** ${interaction.user} (\`${interaction.user.id}\`)\n\n` +
              `**Nombre Delta Force:** ${deltaName}\n` +
              `**UID Delta Force:** ${deltaUid}\n` +
              `**País:** ${country}\n` +
              `**Horario de conexión:**\n${schedule}\n\n` +
              `**Estado:** ⏳ Pending`
          )
          .setTimestamp()
          .setFooter({ text: `Servidor: ${guild.name}` });

        await ticketChannel.send({
          content:
            `${interaction.user} gracias por postular.\n` +
            'Por favor, adjunta **una captura de tus stats en Delta Force** para completar la revisión.',
          embeds: [appEmbed]
        });

        await interaction.reply({
          content: `✅ Tu postulación fue enviada. Se ha abierto un ticket en ${ticketChannel}.`,
          flags: MessageFlags.Ephemeral
        });

        return;
      }

      // Otros modales que puedas tener en el futuro
      return;
    }

    // 🟣 Solo slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    // 🛡️ Validación de admin para comandos marcados con isAdmin,
    // usando SUPERADMIN como override global
    if (command.isAdmin) {
      const userId = interaction.user.id;

      if (superAdminIds.length > 0) {
        // Solo SUPERADMIN puede usar estos comandos
        if (!superAdminIds.includes(userId)) {
          try {
            await interaction.reply({
              content:
                '❌ No tienes permisos para usar este comando de administración.',
              flags: MessageFlags.Ephemeral
            });
          } catch (permErr) {
            if (permErr.code !== 10062) {
              logger.error(
                'Error respondiendo falta de permisos (SUPERADMIN):',
                permErr
              );
            }
          }
          return;
        }
      } else {
        // Fallback: si no hay SUPERADMIN definido, usar permiso de Administrador
        if (!interaction.guild) {
          try {
            await interaction.reply({
              content:
                '❌ Este comando de administración solo puede usarse dentro de un servidor.',
              flags: MessageFlags.Ephemeral
            });
          } catch (permErr) {
            if (permErr.code !== 10062) {
              logger.error(
                'Error respondiendo falta de permisos (sin guild):',
                permErr
              );
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
              logger.error(
                'Error respondiendo falta de permisos (permisos Discord):',
                permErr
              );
            }
          }
          return;
        }
      }
    }

    // 🔧 Ejecución del comando
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

      // Log al canal de logs si aplica
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

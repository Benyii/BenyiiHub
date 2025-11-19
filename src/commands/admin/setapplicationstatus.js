// src/commands/admin/setapplicationstatus.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');

const {
  getApplicationByChannel,
  setApplicationStatusByChannel
} = require('../../services/recruitmentService');

const { sendAdminEventLog } = require('../../services/adminEventLogService');

// Roles que se asignarán AUTOMÁTICAMENTE cuando la postulación sea "accepted"
const recruitAcceptRoles = (process.env.RECRUIT_ACCEPT_ROLES || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setapplicationstatus')
    .setDescription('Cambia el estado de la postulación en este ticket.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(opt =>
      opt
        .setName('estado')
        .setDescription('Nuevo estado de la postulación.')
        .setRequired(true)
        .addChoices(
          { name: 'Pending', value: 'pending' },
          { name: 'Accepted', value: 'accepted' },
          { name: 'Rejected', value: 'rejected' }
        )
    )
    .addStringOption(opt =>
      opt
        .setName('motivo')
        .setDescription('Motivo (opcional).')
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('❌ Este comando solo puede usarse en un servidor.');
      return;
    }

    const status = interaction.options.getString('estado', true);
    const reason = interaction.options.getString('motivo') || 'Sin motivo especificado.';
    const moderator = interaction.user;
    const channel = interaction.channel;

    // 1) Obtener postulación asociada a este canal
    const application = await getApplicationByChannel(guild.id, channel.id);
    if (!application) {
      await interaction.editReply(
        '❌ No se encontró ninguna postulación asociada a este canal.'
      );
      return;
    }

    // 2) Actualizar estado en la BD
    await setApplicationStatusByChannel(
      guild.id,
      channel.id,
      status,
      moderator.id
    );

    // 3) Texto de estado
    const statusText =
      status === 'accepted'
        ? '✅ **Accepted**'
        : status === 'rejected'
        ? '❌ **Rejected**'
        : '⏳ **Pending**';

    const statusColor =
      status === 'accepted'
        ? 0x2ecc71
        : status === 'rejected'
        ? 0xe74c3c
        : 0xf1c40f;

    // 4) Embed público en el canal del ticket
    const embedChannel = new EmbedBuilder()
      .setTitle('📌 Estado de postulación actualizado')
      .setColor(statusColor)
      .setDescription(
        `Postulante: <@${application.user_id}> (\`${application.user_id}\`)\n` +
        `Nuevo estado: ${statusText}\n` +
        `Actualizado por: ${moderator} (\`${moderator.id}\`)\n\n` +
        `**Motivo:** ${reason}`
      )
      .setTimestamp();

    await channel.send({ embeds: [embedChannel] });

    // 5) LOG ADMIN (canal de admin logs usando tu sistema actual)
    try {
      const nowTs = Math.floor(Date.now() / 1000);
      const description =
        `🎯 **Cambio de estado de postulación de reclutamiento**\n` +
        `Servidor: \`${guild.name}\` (${guild.id})\n` +
        `Canal del ticket: <#${channel.id}> (${channel.id})\n\n` +
        `Postulante: <@${application.user_id}> (\`${application.user_id}\`)\n` +
        `Nuevo estado: ${statusText}\n` +
        `Actualizado por: ${moderator.tag} (\`${moderator.id}\`)\n` +
        `Motivo: ${reason}\n\n` +
        `Hora: <t:${nowTs}:F>`;

      await sendAdminEventLog(guild.client || interaction.client, guild.id, {
        title: 'Reclutamiento – Estado de postulación actualizado',
        description
      });
    } catch (logErr) {
      // No romper el comando por fallo de log
      console.error('Error enviando adminEventLog en setapplicationstatus:', logErr);
    }

    // 6) Autorol automático si el estado es ACCEPTED
    if (status === 'accepted' && recruitAcceptRoles.length > 0) {
      try {
        const member = await guild.members.fetch(application.user_id).catch(() => null);
        if (member) {
          const rolesToAdd = recruitAcceptRoles
            .map(id => guild.roles.cache.get(id))
            .filter(Boolean);

          if (rolesToAdd.length > 0) {
            await member.roles.add(rolesToAdd);
            await channel.send(
              `🎉 <@${application.user_id}> ha sido **aceptado** y se le han asignado los roles: ` +
              rolesToAdd.map(r => r.toString()).join(', ')
            );
          } else {
            await channel.send(
              'ℹ️ La postulación fue aceptada, pero ninguno de los roles configurados en `RECRUIT_ACCEPT_ROLES` existe en este servidor.'
            );
          }
        } else {
          await channel.send(
            '⚠️ La postulación fue aceptada, pero no se pudo encontrar al usuario en el servidor para asignar roles.'
          );
        }
      } catch (roleErr) {
        console.error('Error asignando roles de reclutamiento:', roleErr);
        await channel.send(
          '⚠️ La postulación fue aceptada, pero hubo un error al asignar los roles configurados.'
        );
      }
    }

    // 7) Respuesta ephem al staff que ejecutó el comando
    await interaction.editReply('✅ Estado de la postulación actualizado correctamente.');
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { getApplicationByChannel } = require('../../services/recruitmentService');

const ticketStaffRoles = (process.env.TICKET_STAFF_ROLES || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fixrecruitticketperms')
    .setDescription('Reaplica los permisos correctos en el ticket de reclutamiento actual.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const channel = interaction.channel;

    if (!guild) {
      await interaction.editReply('❌ Este comando solo puede usarse dentro de un servidor.');
      return;
    }

    const app = await getApplicationByChannel(guild.id, channel.id);
    if (!app) {
      await interaction.editReply(
        '❌ No se encontró ninguna postulación asociada a este canal.'
      );
      return;
    }

    const overwrites = [];

    overwrites.push({
      id: guild.roles.everyone.id,
      deny: ['ViewChannel']
    });

    overwrites.push({
      id: app.user_id,
      allow: [
        'ViewChannel',
        'SendMessages',
        'ReadMessageHistory',
        'AttachFiles',
        'EmbedLinks'
      ]
    });

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

    await channel.permissionOverwrites.set(overwrites);

    await interaction.editReply('✅ Permisos del ticket reaplicados correctamente.');
  }
};

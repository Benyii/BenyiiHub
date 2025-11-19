const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { getApplicationByChannel, closeApplicationByChannel } = require('../../services/recruitmentService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('closerecruitticket')
    .setDescription('Cierra el ticket de reclutamiento actual y lo elimina.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption(opt =>
      opt
        .setName('motivo')
        .setDescription('Motivo del cierre (opcional).')
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

    const reason = interaction.options.getString('motivo') || 'Sin motivo especificado.';
    const channel = interaction.channel;

    const app = await getApplicationByChannel(guild.id, channel.id);
    if (!app) {
      await interaction.editReply(
        '❌ No se encontró ninguna postulación asociada a este canal.'
      );
      return;
    }

    await closeApplicationByChannel(guild.id, channel.id, interaction.user.id);

    await channel.send(
      `🔒 Este ticket ha sido cerrado por ${interaction.user}.\n` +
      `Motivo: ${reason}\n` +
      'El canal será eliminado en unos segundos…'
    );

    await interaction.editReply('✅ Ticket marcado como cerrado. Eliminando canal…');

    setTimeout(() => {
      channel.delete('Ticket de reclutamiento cerrado').catch(() => {});
    }, 5000);
  }
};

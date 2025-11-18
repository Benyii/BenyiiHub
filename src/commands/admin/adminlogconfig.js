// src/commands/admin/adminlogconfig.js
const {
  SlashCommandBuilder,
  PermissionsBitField
} = require('discord.js');
const { setAdminLogFlag, getAdminLogFlag, getAdminEventLogChannel } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminlogconfig')
    .setDescription('Activa o desactiva los logs administrativos del servidor')
    .addStringOption(opt =>
      opt
        .setName('estado')
        .setDescription('Activar o desactivar los logs administrativos')
        .setRequired(true)
        .addChoices(
          { name: 'Activar', value: 'on' },
          { name: 'Desactivar', value: 'off' }
        )
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Este comando solo puede usarse dentro de un servidor.',
        flags: 64
      });
    }

    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Solo administradores pueden usar `/adminlogconfig`.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const guildId = guild.id;
    const estado = interaction.options.getString('estado');
    const enabled = estado === 'on';

    try {
      await setAdminLogFlag(guildId, enabled);

      const current = await getAdminLogFlag(guildId);
      const channelId = await getAdminEventLogChannel(guildId);

      const channelDisplay = channelId
        ? `<#${channelId}> (\`${channelId}\`)`
        : '⚠️ No configurado';

      await interaction.reply({
        content:
          `✅ Logs administrativos **${current ? 'ACTIVADOS' : 'DESACTIVADOS'}**.\n` +
          `Canal de logs administrativos actual: ${channelDisplay}`,
        flags: 64
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocurrió un error actualizando la configuración de logs administrativos.',
        flags: 64
      });
    }
  }
};

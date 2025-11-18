// src/commands/admin/userlogstatus.js
const {
  SlashCommandBuilder,
  PermissionsBitField
} = require('discord.js');
const {
  getUserLogFlags,
  getUserEventLogChannel
} = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userlogstatus')
    .setDescription('Muestra la configuración actual de logs de usuario para este servidor'),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Este comando solo puede usarse dentro de un servidor.',
        flags: 64
      });
    }

    // Solo administradores
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Solo administradores pueden usar `/userlogstatus`.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const guildId = guild.id;

    try {
      const flagsConfig = await getUserLogFlags(guildId);
      const userLogChannelId = await getUserEventLogChannel(guildId);

      const channelDisplay = userLogChannelId
        ? `<#${userLogChannelId}> (\`${userLogChannelId}\`)`
        : '⚠️ No configurado';

      const embed = {
        title: 'Estado de logs de usuario',
        description:
          `Servidor: **${guild.name}** (\`${guild.id}\`)\n` +
          `Canal de logs de usuario: ${channelDisplay}`,
        color: 0x3498db, // azul info
        fields: [
          {
            name: 'Mensajes borrados',
            value: flagsConfig.messageDelete ? '✅ ON' : '❌ OFF',
            inline: true
          },
          {
            name: 'Mensajes editados',
            value: flagsConfig.messageEdit ? '✅ ON' : '❌ OFF',
            inline: true
          },
          {
            name: 'Eventos de voz (join/leave)',
            value: flagsConfig.voice ? '✅ ON' : '❌ OFF',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Configuración de logs de nivel usuario'
        }
      };

      await interaction.reply({
        embeds: [embed],
        flags: 64 // respuesta solo visible para el admin que ejecuta el comando
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocurrió un error obteniendo el estado de los logs de usuario.',
        flags: 64
      });
    }
  }
};

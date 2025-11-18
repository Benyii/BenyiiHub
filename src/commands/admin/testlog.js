// src/commands/admin/testlog.js
const {
  SlashCommandBuilder,
  PermissionsBitField
} = require('discord.js');
const {
  sendLogToGuild,
  sendErrorLogToGuild
} = require('../../services/logChannelService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testlog')
    .setDescription('Prueba el sistema de logs del bot en el canal de logs configurado')
    .addStringOption(opt =>
      opt
        .setName('tipo')
        .setDescription('Tipo de log a probar')
        .setRequired(true)
        .addChoices(
          { name: 'Info (azul)', value: 'info' },
          { name: 'Warning (amarillo)', value: 'warning' },
          { name: 'Error (rojo, con stack)', value: 'error' },
          { name: 'Success (verde)', value: 'success' }
        )
    )
    .addStringOption(opt =>
      opt
        .setName('mensaje')
        .setDescription('Mensaje opcional para el log de prueba')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: 'Este comando solo puede usarse dentro de un servidor.',
        flags: 64 // EPHEMERAL
      });
    }

    // Solo administradores
    if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '❌ Solo administradores pueden usar `/testlog`.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const tipo = interaction.options.getString('tipo');
    const mensaje = interaction.options.getString('mensaje') || 'Este es un log de prueba generado por /testlog.';

    // Respuesta al administrador
    await interaction.reply({
      content: `✅ Se ha enviado un log de prueba de tipo **${tipo.toUpperCase()}** al canal de logs (si está configurado).`,
      flags: 64
    });

    // Enviar el log al canal de logs
    if (tipo === 'error') {
      // Creamos un error artificial para probar el embed con stack
      const testError = new Error('Error de prueba generado desde /testlog');

      await sendErrorLogToGuild(interaction.client, guild.id, {
        title: 'Test de log de ERROR',
        description:
          `${mensaje}\n\n` +
          `Comando ejecutado por: ${interaction.user.tag} (${interaction.user.id})\n` +
          `Servidor: ${guild.name} (${guild.id})`,
        error: testError
      });
    } else {
      await sendLogToGuild(interaction.client, guild.id, {
        level: tipo,
        title: `Test de log ${tipo.toUpperCase()}`,
        description:
          `${mensaje}\n\n` +
          `Comando ejecutado por: ${interaction.user.tag} (${interaction.user.id})\n` +
          `Servidor: ${guild.name} (${guild.id})`
      });
    }
  }
};

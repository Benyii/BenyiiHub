// src/commands/admin/userlogconfig.js
const {
  SlashCommandBuilder,
  PermissionsBitField
} = require('discord.js');
const { setUserLogFlag, getUserLogFlags } = require('../../services/guildService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userlogconfig')
    .setDescription('Configura qué eventos de usuario se registran en los logs')
    .addStringOption(opt =>
      opt
        .setName('tipo')
        .setDescription('Tipo de evento a activar/desactivar')
        .setRequired(true)
        .addChoices(
          { name: 'Mensajes borrados', value: 'delete' },
          { name: 'Mensajes editados', value: 'edit' },
          { name: 'Eventos de voz (join/leave)', value: 'voice' },
          { name: 'Todos', value: 'all' }
        )
    )
    .addStringOption(opt =>
      opt
        .setName('estado')
        .setDescription('Activar o desactivar')
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
        content: '❌ Solo administradores pueden usar `/userlogconfig`.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const guildId = guild.id;
    const tipo = interaction.options.getString('tipo');
    const estado = interaction.options.getString('estado');
    const enabled = estado === 'on';

    try {
      if (tipo === 'all') {
        await Promise.all([
          setUserLogFlag(guildId, 'delete', enabled),
          setUserLogFlag(guildId, 'edit', enabled),
          setUserLogFlag(guildId, 'voice', enabled)
        ]);
      } else {
        await setUserLogFlag(guildId, tipo, enabled);
      }

      const flags = await getUserLogFlags(guildId);

      let resumen =
        `Configuración actual de logs de usuario para **${guild.name}**:\n` +
        `• Mensajes borrados: **${flags.messageDelete ? 'ON' : 'OFF'}**\n` +
        `• Mensajes editados: **${flags.messageEdit ? 'ON' : 'OFF'}**\n` +
        `• Voz (join/leave): **${flags.voice ? 'ON' : 'OFF'}**`;

      await interaction.reply({
        content: `✅ Configuración actualizada.\n\n${resumen}`,
        flags: 64
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: '❌ Ocurrió un error actualizando la configuración de logs de usuario.',
        flags: 64
      });
    }
  }
};

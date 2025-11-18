// src/commands/admin/testwelcome.js

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const {
  getWelcomeBoostSettings
} = require('../../services/guildService');

const {
  generateWelcomeImage,
  generateBoostImage
} = require('../../services/welcomeImageService');

const { applyWelcomeTemplate } = require('../../utils/welcomeTemplate');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testwelcome')
    .setDescription('Genera una imagen de bienvenida o boost para un usuario de prueba.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario a usar en la prueba.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('tipo')
        .setDescription('Tipo de evento a simular.')
        .addChoices(
          { name: 'Bienvenida', value: 'welcome' },
          { name: 'Boost', value: 'boost' }
        )
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const user = interaction.options.getUser('usuario', true);
      const tipo = interaction.options.getString('tipo', true);

      const member = await interaction.guild.members.fetch(user.id);
      if (!member) {
        return interaction.editReply('❌ No encontré ese usuario en este servidor.');
      }

      const guild = interaction.guild;

      // Config
      const settings = await getWelcomeBoostSettings(guild.id);

      if (!settings) {
        return interaction.editReply('❌ El servidor no tiene configuración de bienvenida/boost.');
      }

      // Canal según tipo
      let channelId = null;
      if (tipo === 'welcome') channelId = settings.welcome_channel_id;
      if (tipo === 'boost') channelId = settings.boost_channel_id;

      if (!channelId) {
        return interaction.editReply(`❌ No hay un canal configurado para **${tipo}**.`);
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isTextBased()) {
        return interaction.editReply('❌ El canal configurado no es válido.');
      }

      const shortName = settings.short_guild_name || guild.name;

      // Plantilla según tipo
      let template;
      if (tipo === 'welcome') {
        template =
          settings.welcome_custom_message ||
          '🎉 {mention}, ¡bienvenido/a al servidor {server}! Actualmente somos {membercount} miembros.';
      } else {
        // boost
        template = '💜 {mention} ha boosteado el servidor {server}! Ahora somos {membercount} miembros.';
      }

      const content = applyWelcomeTemplate(template, {
        member,
        guild,
        shortName
      });

      // Generar imagen
      let attachment = null;
      if (tipo === 'welcome') {
        attachment = await generateWelcomeImage(member, shortName);
      } else {
        attachment = await generateBoostImage(member);
      }

      if (attachment) {
        await channel.send({
          content,
          files: [attachment]
        });
      } else {
        await channel.send(content + ' ⚠️ (No se pudo generar la imagen)');
      }

      await interaction.editReply('✅ Test enviado correctamente.');
    } catch (err) {
      logger.error('Error en /testwelcome:', err);
      await interaction.editReply('❌ Error ejecutando el comando de test.');
    }
  }
};

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

      const settings = await getWelcomeBoostSettings(interaction.guild.id);

      let channelId = null;

      if (tipo === 'welcome') channelId = settings?.welcome_channel_id;
      if (tipo === 'boost') channelId = settings?.boost_channel_id;

      if (!channelId) {
        return interaction.editReply(`❌ No hay un canal configurado para **${tipo}**.`);
      }

      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel || !channel.isTextBased()) {
        return interaction.editReply('❌ El canal configurado no es válido.');
      }

      // Generar imagen
      const attachment =
        tipo === 'welcome'
          ? await generateWelcomeImage(member)
          : await generateBoostImage(member);

      const content =
        tipo === 'welcome'
          ? `🔧 **TEST** — Simulando bienvenida para ${member}`
          : `🔧 **TEST** — Simulando boost para ${member}`;

      if (attachment) {
        await channel.send({
          content,
          files: [attachment]
        });
      } else {
        await channel.send(content + ' (⚠️ No se pudo generar la imagen)');
      }

      await interaction.editReply('✅ Test enviado correctamente.');

    } catch (err) {
      logger.error('Error en /testwelcome:', err);
      await interaction.editReply('❌ Error ejecutando el comando de test.');
    }
  }
};

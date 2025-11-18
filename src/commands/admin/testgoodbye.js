const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const {
  getWelcomeBoostSettings
} = require('../../services/guildService');

const { generateGoodbyeImage } = require('../../services/goodbyeImageService');
const { applyWelcomeTemplate } = require('../../utils/welcomeTemplate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testgoodbye')
    .setDescription('Simula una despedida para un usuario.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(o =>
      o.setName('usuario').setDescription('Usuario a simular').setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser('usuario', true);
    const member = await interaction.guild.members.fetch(user.id);

    const settings = await getWelcomeBoostSettings(interaction.guild.id);

    if (!settings.goodbye_channel_id) {
      return interaction.editReply('❌ No hay canal configurado para despedidas.');
    }

    const channel =
      interaction.guild.channels.cache.get(settings.goodbye_channel_id);

    const shortName = settings.short_guild_name ?? interaction.guild.name;

    const template =
      settings.goodbye_custom_message ??
      'Adiós! {mention} se ha ido del servidor…';

    const content = applyWelcomeTemplate(template, {
      member,
      guild: interaction.guild,
      shortName
    });

    const img = await generateGoodbyeImage(member, shortName);

    await channel.send({
      content,
      files: img ? [img] : []
    });

    await interaction.editReply('✅ Despedida enviada!');
  }
};

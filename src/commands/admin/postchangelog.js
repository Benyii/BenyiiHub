const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');

const {
  getChangelogChannel,
  createChangelogEntry
} = require('../../services/changelogService');

const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('postchangelog')
    .setDescription('Publica una actualización del bot en el canal de changelog.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt
        .setName('version')
        .setDescription('Versión del bot (ej: v1.0.3).')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('titulo')
        .setDescription('Título corto de la actualización.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('descripcion')
        .setDescription('Descripción detallada de los cambios.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('tipo')
        .setDescription('Tipo de actualización.')
        .setRequired(true)
        .addChoices(
          { name: 'Patch (correcciones pequeñas)', value: 'patch' },
          { name: 'Minor (mejoras/piezas nuevas)', value: 'minor' },
          { name: 'Major (cambios grandes)', value: 'major' }
        )
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply('❌ Este comando solo puede usarse en un servidor.');
    }

    const version = interaction.options.getString('version', true);
    const title = interaction.options.getString('titulo', true);
    const description = interaction.options.getString('descripcion', true);
    const changeType = interaction.options.getString('tipo', true);

    // Obtener canal de changelog
    const changelogChannelId = await getChangelogChannel(guild.id);
    if (!changelogChannelId) {
      return interaction.editReply(
        '❌ No hay canal de changelog configurado.\n' +
        'Configúralo primero con `/setchangelogchannel`.'
      );
    }

    const channel = guild.channels.cache.get(changelogChannelId);
    if (!channel || !channel.isTextBased()) {
      return interaction.editReply(
        '❌ El canal configurado ya no existe o no es válido. Reconfigúralo con `/setchangelogchannel`.'
      );
    }

    // Guardar en DB
    try {
      await createChangelogEntry({
        version,
        title,
        description,
        createdBy: interaction.user.id,
        changeType
      });
    } catch (err) {
      logger.error('Error guardando entry:', err);
      return interaction.editReply('❌ Error al guardar el changelog en la base de datos.');
    }

    // COLOR según tipo
    const typeColors = {
      patch: 0x3498db,  // azul
      minor: 0xf1c40f,  // amarillo
      major: 0xe74c3c   // rojo
    };

    const color = typeColors[changeType] || 0x2ecc71;

    // Construir embed
    const embed = new EmbedBuilder()
      .setTitle(`📢 Actualización del bot - ${version}`)
      .setColor(color)
      .setDescription(
        `**${title}**\n\n${description}`
      )
      .addFields({
        name: 'Tipo de actualización',
        value:
          changeType === 'patch' ? '🔧 Patch' :
          changeType === 'minor' ? '✨ Minor' :
          '🚀 Major'
      })
      .setTimestamp()
      .setFooter({
        text: `Publicado por ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ size: 64 })
      });

    // Enviar
    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      logger.error('Error enviando embed:', err);
      return interaction.editReply('❌ No pude enviar el changelog al canal (revisa permisos).');
    }

    await interaction.editReply(
      `✅ Changelog **${version}** publicado correctamente en ${channel}.`
    );
  }
};

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require('discord.js');

const {
  getDynamicConfigById,
  setCreatorChannel
} = require('../../services/dynamicVoiceService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setcreatedynamicvoicechannel')
    .setDescription('Crea el canal "➕ Crear canal ..." para una configuración de canales dinámicos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(opt =>
      opt
        .setName('config_id')
        .setDescription('ID de la configuración creada con /setcategoryvoicechannel.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('nombre')
        .setDescription('Nombre base para el canal (por ejemplo: "Sala").')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('userlimit')
        .setDescription('Límite de usuarios para los canales dinámicos (0 = sin límite).')
        .setMinValue(0)
        .setRequired(false)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const configId = interaction.options.getInteger('config_id', true);
    const baseName = interaction.options.getString('nombre', true);
    const dynamicUserLimit = interaction.options.getInteger('userlimit') ?? 0;

    const config = await getDynamicConfigById(interaction.guild.id, configId);
    if (!config) {
      return interaction.editReply(`❌ No encontré la configuración **#${configId}**.`);
    }

    const guild = interaction.guild;
    const category = guild.channels.cache.get(config.source_category_id);

    if (!category || category.type !== ChannelType.GuildCategory) {
      return interaction.editReply(
        '❌ La categoría origen configurada ya no existe o no es válida.'
      );
    }

    const channelName = `➕ Crear canal ${baseName}`;

    // Canal creador: límite 1 usuario
    const creatorChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: category.id,
      userLimit: 1
    });

    await setCreatorChannel(
      guild.id,
      configId,
      creatorChannel.id,
      baseName,
      dynamicUserLimit
    );

    await interaction.editReply(
      `✅ Canal creador creado: <#${creatorChannel.id}> (ID: \`${creatorChannel.id}\`)\n` +
      `Base: \`${baseName}\` | Config ID: **#${configId}** | Límite dinámico: \`${dynamicUserLimit === 0 ? 'sin límite' : dynamicUserLimit}\``
    );
  }
};

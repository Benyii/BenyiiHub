const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');

const {
  setRulesChannel,
  updateRulesMessageId,
  getRules
} = require('../../services/rulesService');

const RULES_BANNER_URL = process.env.RULES_BANNER_URL || null;

function buildRulesEmbed(guild, rules) {
  const icon = guild.iconURL({ size: 512 });

  const descriptionLines = [];
  descriptionLines.push('Ayúdanos a construir una comunidad limpia.\n');

  if (rules.length === 0) {
    descriptionLines.push('_Aún no se han configurado reglas._');
  } else {
    for (const r of rules) {
      descriptionLines.push(
        `**${r.rule_index}. ${r.title}** ${r.description}`
      );
    }
  }

  descriptionLines.push('\nSigue las Directrices de la Comunidad de Discord.');
  descriptionLines.push('Puedes encontrarlas aquí: https://discordapp.com/guidelines');
  descriptionLines.push('\n✅ Al permanecer en este servidor, aceptas cumplir con estas normas.');

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('Reglas del servidor')
    .setDescription(descriptionLines.join('\n'));

  if (icon) embed.setThumbnail(icon);

  embed.addFields(
    {
      name: 'Contamos contigo',
      value:
        'Tu presencia en este servidor implica la aceptación de estas reglas, incluyendo todos los cambios posteriores. ' +
        'Estos cambios pueden realizarse en cualquier momento sin previo aviso, es tu responsabilidad comprobarlos.',
      inline: true
    },
    {
      name: 'No nos hagas enojar',
      value:
        'Los administradores y moderadores silenciarán/expulsarán/prohibirán según su criterio. ' +
        'Si te sientes maltratado, contacta con un administrador y resolveremos el problema.',
      inline: true
    }
  );

  if (RULES_BANNER_URL) {
    embed.setImage(RULES_BANNER_URL);
  }

  embed.setFooter({ text: `Comunidad ${guild.name}` });

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setruleschannel')
    .setDescription('Configura el canal y publica el embed de reglas.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal donde se publicarán las reglas.')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = interaction.options.getChannel('canal', true);
    const guild = interaction.guild;

    const rules = await getRules(guild.id);
    const embed = buildRulesEmbed(guild, rules);

    const msg = await channel.send({ embeds: [embed] });

    await setRulesChannel(guild.id, channel.id, msg.id);

    await interaction.editReply(
      `✅ Canal de reglas configurado en ${channel}. (mensaje ID: \`${msg.id}\`)`
    );
  },

  // exportar también el builder para otros comandos
  buildRulesEmbed
};

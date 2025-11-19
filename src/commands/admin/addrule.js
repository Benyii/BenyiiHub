const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const {
  addRule,
  getRulesSettings,
  getRules,
  updateRulesMessageId
} = require('../../services/rulesService');

const { buildRulesEmbed } = require('./setruleschannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addrule')
    .setDescription('Añade una regla al embed de reglas.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt =>
      opt
        .setName('titulo')
        .setDescription('Título corto de la regla.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('descripcion')
        .setDescription('Descripción de la regla.')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const title = interaction.options.getString('titulo', true);
    const description = interaction.options.getString('descripcion', true);
    const guild = interaction.guild;

    const index = await addRule(guild.id, title, description);

    const settings = await getRulesSettings(guild.id);
    if (!settings || !settings.rules_channel_id) {
      await interaction.editReply(
        `✅ Regla #${index} añadida, pero aún no hay canal de reglas configurado. ` +
        'Usa `/setruleschannel` para publicar el embed.'
      );
      return;
    }

    const channel = guild.channels.cache.get(settings.rules_channel_id);
    if (!channel) {
      await interaction.editReply(
        `✅ Regla #${index} añadida, pero el canal configurado ya no existe. ` +
        'Configura uno nuevo con `/setruleschannel`.'
      );
      return;
    }

    const rules = await getRules(guild.id);
    const embed = buildRulesEmbed(guild, rules);

    if (settings.rules_message_id) {
      const msg = await channel.messages.fetch(settings.rules_message_id).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
      } else {
        const newMsg = await channel.send({ embeds: [embed] });
        await updateRulesMessageId(guild.id, newMsg.id);
      }
    } else {
      const newMsg = await channel.send({ embeds: [embed] });
      await updateRulesMessageId(guild.id, newMsg.id);
    }

    await interaction.editReply(`✅ Regla #${index} añadida y embed actualizado.`);
  }
};

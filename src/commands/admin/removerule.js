const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const {
  removeRuleByIndex,
  getRulesSettings,
  getRules,
  updateRulesMessageId
} = require('../../services/rulesService');

const { buildRulesEmbed } = require('./setruleschannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removerule')
    .setDescription('Elimina una regla por su número.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt =>
      opt
        .setName('numero')
        .setDescription('Número de la regla (rule_index).')
        .setRequired(true)
    ),

  isAdmin: true,

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const index = interaction.options.getInteger('numero', true);
    const guild = interaction.guild;

    await removeRuleByIndex(guild.id, index);

    const settings = await getRulesSettings(guild.id);
    if (!settings || !settings.rules_channel_id) {
      await interaction.editReply(`✅ Regla #${index} eliminada. No hay canal de reglas configurado.`);
      return;
    }

    const channel = guild.channels.cache.get(settings.rules_channel_id);
    if (!channel) {
      await interaction.editReply(
        `✅ Regla #${index} eliminada, pero el canal configurado ya no existe. ` +
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

    await interaction.editReply(`✅ Regla #${index} eliminada y embed actualizado.`);
  }
};

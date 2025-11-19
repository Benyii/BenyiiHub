// src/commands/general/rank.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

const { getUserRankData } = require('../../services/statsService');
const { generateRankCard } = require('../../services/rankCardService');
const logger = require('../../config/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Muestra tu tarjeta de nivel y XP. Solo admins pueden consultar a otros usuarios.')
    .addUserOption(opt =>
      opt
        .setName('usuario')
        .setDescription('Usuario a consultar (solo admins).')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // NO ephemeral → visible para todos
      await interaction.deferReply();

      const guild = interaction.guild;
      if (!guild) {
        return interaction.editReply('❌ Este comando solo puede usarse dentro de un servidor.');
      }

      const requestingMember = await guild.members.fetch(interaction.user.id);

      // Usuario objetivo
      const optionUser = interaction.options.getUser('usuario');

      let targetUser = interaction.user; // Por defecto, uno mismo
      let usingAdminOption = false;

      if (optionUser) {
        usingAdminOption = true;

        // Verificar permisos administrativos
        const hasAdminPerms =
          requestingMember.permissions.has(PermissionFlagsBits.Administrator) ||
          requestingMember.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!hasAdminPerms) {
          return interaction.editReply(
            '❌ Solo administradores pueden ver el **rank de otros usuarios**. Puedes ver tu propio rank usando `/rank`.'
          );
        }

        // Admin autorizado → puede ver a otro usuario
        targetUser = optionUser;
      }

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.editReply('❌ No encontré a ese usuario en este servidor.');
      }

      const rankData = await getUserRankData(guild.id, member.id);
      if (!rankData) {
        return interaction.editReply('❌ No hay datos registrados para este usuario.');
      }

      const attachment = await generateRankCard(member, {
        xp: rankData.xp,
        lvl: rankData.lvl,
        rank: rankData.rank
      });

      if (!attachment) {
        return interaction.editReply('❌ No se pudo generar la imagen de rank.');
      }

      await interaction.editReply({
        content:
          usingAdminOption
            ? `📈 Rank de **${targetUser.tag}**:`
            : `📈 Tu Rank actual:`,
        files: [attachment]
      });

    } catch (err) {
      logger.error('Error en comando /rank:', err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Ocurrió un error procesando /rank.');
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error procesando /rank.',
          ephemeral: true
        });
      }
    }
  }
};

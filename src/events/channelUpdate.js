// src/events/channelUpdate.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorLine } = require('../utils/auditLogHelper');
const { diffOverwritePerms } = require('../utils/diffPermissions');
const logger = require('../config/logger');

function channelTypeName(type) {
  switch (type) {
    case 0: return 'Texto';
    case 2: return 'Voz';
    case 4: return 'Categoría';
    default: return `Tipo ${type}`;
  }
}

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    try {
      const guild = newChannel.guild;
      const guildId = guild?.id;
      if (!guildId) return;

      const tipo = channelTypeName(newChannel.type);

      const executorLine = await getExecutorLine(
        guild,
        AuditLogEvent.ChannelUpdate,
        newChannel.id
      );

      const changes = [];

      // Nombre
      if (oldChannel.name !== newChannel.name) {
        changes.push(`• Nombre: \`${oldChannel.name}\` → \`${newChannel.name}\``);
      }

      // Categoría
      if (oldChannel.parentId !== newChannel.parentId) {
        const oldCat = oldChannel.parent?.name || 'Sin categoría';
        const newCat = newChannel.parent?.name || 'Sin categoría';
        changes.push(`• Categoría: \`${oldCat}\` → \`${newCat}\``);
      }

      // Topic (canal de texto)
      if ('topic' in oldChannel || 'topic' in newChannel) {
        const oldT = oldChannel.topic || '(vacío)';
        const newT = newChannel.topic || '(vacío)';
        if (oldT !== newT) {
          changes.push(`• Tópico: \`${oldT}\` → \`${newT}\``);
        }
      }

      // 🔥 Overwrites de permisos
      const oldPerms = oldChannel.permissionOverwrites.cache;
      const newPerms = newChannel.permissionOverwrites.cache;

      for (const [id, newOvr] of newPerms) {
        const oldOvr = oldPerms.get(id);

        if (!oldOvr) continue;

        const diff = diffOverwritePerms(oldOvr, newOvr);

        if (diff.length > 0) {
          const targetName =
            newOvr.type === 0
              ? `Usuario <@${id}>`
              : `Rol <@&${id}>`;

          const lines = diff
            .map(d => `• **${d.permission}**: ${d.before} → ${d.after}`)
            .join('\n');

          changes.push(
            `\n🔐 **Permisos modificados para ${targetName}**:\n${lines}`
          );
        }
      }

      if (changes.length === 0) return;

      const description =
        `📁 **Canal modificado**\n` +
        `Canal: \`${newChannel.name}\` (${newChannel.id})\n` +
        `Tipo: ${tipo}\n` +
        `${executorLine}\n\n` +
        `**Cambios detectados:**\n${changes.join('\n')}`;

      await sendAdminEventLog(client, guildId, {
        title: 'Canal modificado',
        description
      });
    } catch (err) {
      logger.error('Error detallado en channelUpdate:', err);
    }
  }
};

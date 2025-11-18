// src/events/roleUpdate.js
const { sendAdminEventLog } = require('../services/adminEventLogService');
const { AuditLogEvent, getExecutorLine } = require('../utils/auditLogHelper');
const { diffRolePermissions } = require('../utils/diffPermissions');
const logger = require('../config/logger');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole, client) {
    try {
      const guild = newRole.guild;
      const guildId = guild?.id;
      if (!guildId) return;

      const executorLine = await getExecutorLine(
        guild,
        AuditLogEvent.RoleUpdate,
        newRole.id
      );

      const changes = [];

      // Nombre
      if (oldRole.name !== newRole.name) {
        changes.push(`• Nombre: \`${oldRole.name}\` → \`${newRole.name}\``);
      }

      // Color
      if (oldRole.color !== newRole.color) {
        changes.push(
          `• Color: \`#${oldRole.color.toString(16).padStart(6, '0')}\` → \`#${newRole.color.toString(16).padStart(6, '0')}\``
        );
      }

      // Mencionable
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(
          `• Mencionable: ${oldRole.mentionable ? 'Sí' : 'No'} → ${newRole.mentionable ? 'Sí' : 'No'}`
        );
      }

      // 🔥 Permisos específicos
      const permDiff = diffRolePermissions(oldRole, newRole);

      if (permDiff.length > 0) {
        const lines = permDiff
          .map(d => `• **${d.permission}**: ${d.before} → ${d.after}`)
          .join('\n');
        changes.push(`\n🔐 **Permisos del rol modificados:**\n${lines}`);
      }

      if (changes.length === 0) return;

      const description =
        `🧱 **Rol modificado**\n` +
        `Rol: <@&${newRole.id}> (\`${newRole.id}\`)\n` +
        `${executorLine}\n\n` +
        `**Cambios detectados:**\n${changes.join('\n')}`;

      await sendAdminEventLog(client, guildId, {
        title: 'Rol modificado',
        description
      });
    } catch (err) {
      logger.error('Error en roleUpdate:', err);
    }
  }
};

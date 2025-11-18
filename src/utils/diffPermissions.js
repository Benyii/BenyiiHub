// src/utils/diffPermissions.js
const { PermissionFlagsBits } = require('discord.js');

/**
 * Devuelve los emojis personalizados de toggleon/toggleoff si existen en el cache del cliente.
 * @param {import('discord.js').Client} client
 */
function getToggleEmojis(client) {
  const emojis = {
    allow: 'ALLOW',
    deny: 'DENY',
    neutral: 'NEUTRAL'
  };

  if (!client || !client.emojis) return emojis;

  const on = client.emojis.cache.find(e => e.name === 'toggleon');
  const off = client.emojis.cache.find(e => e.name === 'toggleoff');

  if (on) emojis.allow = `<:${on.name}:${on.id}>`;
  if (off) emojis.deny = `<:${off.name}:${off.id}>`;

  return emojis;
}

/**
 * Determina el estado de un permiso:
 *  - "ALLOW"
 *  - "DENY"
 *  - "NEUTRAL"
 */
function resolvePermissionState(allowBits, denyBits, bit) {
  if ((allowBits & bit) === bit) return 'ALLOW';
  if ((denyBits & bit) === bit) return 'DENY';
  return 'NEUTRAL';
}

/**
 * Diff entre overwrites de canal
 */
function diffOverwritePerms(oldOverwrite, newOverwrite, client) {
  const oldAllow = BigInt(oldOverwrite.allow?.bitfield ?? 0n);
  const oldDeny  = BigInt(oldOverwrite.deny?.bitfield ?? 0n);
  const newAllow = BigInt(newOverwrite.allow?.bitfield ?? 0n);
  const newDeny  = BigInt(newOverwrite.deny?.bitfield ?? 0n);

  const { allow: allowEmoji, deny: denyEmoji, neutral: neutralEmoji } =
    getToggleEmojis(client);

  const changes = [];

  for (const [permName, bit] of Object.entries(PermissionFlagsBits)) {
    const before = resolvePermissionState(oldAllow, oldDeny, bit);
    const after  = resolvePermissionState(newAllow, newDeny, bit);

    if (before !== after) {
      changes.push({
        permission: permName,
        before,
        beforeIcon: before === 'ALLOW' ? allowEmoji :
                     before === 'DENY' ?  denyEmoji :
                     neutralEmoji,
        after,
        afterIcon: after === 'ALLOW' ? allowEmoji :
                    after === 'DENY' ?  denyEmoji :
                    neutralEmoji
      });
    }
  }

  return changes;
}

/**
 * Diff entre roles
 */
function diffRolePermissions(oldRole, newRole, client) {
  const oldBits = BigInt(oldRole.permissions?.bitfield ?? 0n);
  const newBits = BigInt(newRole.permissions?.bitfield ?? 0n);

  const { allow: allowEmoji, deny: denyEmoji, neutral: neutralEmoji } =
    getToggleEmojis(client);

  const changes = [];

  for (const [permName, bit] of Object.entries(PermissionFlagsBits)) {
    const hadBefore = (oldBits & bit) === bit;
    const hasNow    = (newBits & bit) === bit;

    if (hadBefore !== hasNow) {
      const before = hadBefore ? 'ALLOW' : 'DENY';
      const after  = hasNow ? 'ALLOW' : 'DENY';

      changes.push({
        permission: permName,
        before,
        beforeIcon: before === 'ALLOW' ? allowEmoji : denyEmoji,
        after,
        afterIcon: after === 'ALLOW' ? allowEmoji  : denyEmoji
      });
    }
  }

  return changes;
}

module.exports = {
  diffOverwritePerms,
  diffRolePermissions
};

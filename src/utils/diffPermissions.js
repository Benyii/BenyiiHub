// src/utils/diffPermissions.js
const { PermissionFlagsBits } = require('discord.js');

/**
 * Determina el estado de un permiso dado:
 *  - "ALLOW"
 *  - "DENY"
 *  - "NEUTRAL"
 *
 * @param {bigint} allowBits
 * @param {bigint} denyBits
 * @param {bigint} bit
 */
function resolvePermissionState(allowBits, denyBits, bit) {
  if ((allowBits & bit) === bit) return 'ALLOW';
  if ((denyBits & bit) === bit) return 'DENY';
  return 'NEUTRAL';
}

/**
 * Diff de overwrites de canal (permiso por permiso).
 *
 * oldOverwrite / newOverwrite son PermissionOverwrites de discord.js
 * Retorna array de:
 *  { permission: 'SendMessages', before: 'DENY', after: 'ALLOW' }
 */
function diffOverwritePerms(oldOverwrite, newOverwrite) {
  const oldAllow = BigInt(oldOverwrite.allow?.bitfield ?? 0n);
  const oldDeny  = BigInt(oldOverwrite.deny?.bitfield ?? 0n);
  const newAllow = BigInt(newOverwrite.allow?.bitfield ?? 0n);
  const newDeny  = BigInt(newOverwrite.deny?.bitfield ?? 0n);

  const changes = [];

  for (const [permName, bit] of Object.entries(PermissionFlagsBits)) {
    const before = resolvePermissionState(oldAllow, oldDeny, bit);
    const after  = resolvePermissionState(newAllow, newDeny, bit);

    if (before !== after) {
      changes.push({
        permission: permName,
        before,
        after
      });
    }
  }

  return changes;
}

/**
 * Diff de permisos de un rol completo.
 *
 * Recibe oldRole y newRole (Role de discord.js)
 * Retorna array de:
 *  { permission: 'ManageChannels', before: 'ALLOW', after: 'DENY' }
 */
function diffRolePermissions(oldRole, newRole) {
  const oldBits = BigInt(oldRole.permissions?.bitfield ?? 0n);
  const newBits = BigInt(newRole.permissions?.bitfield ?? 0n);

  const changes = [];

  for (const [permName, bit] of Object.entries(PermissionFlagsBits)) {
    const hadBefore = (oldBits & bit) === bit;
    const hasNow    = (newBits & bit) === bit;

    if (hadBefore !== hasNow) {
      changes.push({
        permission: permName,
        before: hadBefore ? 'ALLOW' : 'DENY',
        after:  hasNow    ? 'ALLOW' : 'DENY'
      });
    }
  }

  return changes;
}

module.exports = {
  diffOverwritePerms,
  diffRolePermissions
};

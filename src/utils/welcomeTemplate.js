// src/utils/welcomeTemplate.js

/**
 * Aplica los placeholders soportados en el mensaje de bienvenida / boost.
 *
 * Placeholders:
 *  - {user}        => username (ej: rizkonne)
 *  - {mention}     => mención del usuario (ej: @rizkonne)
 *  - {server}      => nombre corto o nombre del servidor
 *  - {membercount} => cantidad de miembros del servidor
 *
 * Placeholders especiales por ID:
 *  - {channel:ID}  => <#ID>
 *  - {role:ID}     => <@&ID>
 *  - {user:ID}     => <@ID>
 *
 * Además, si el texto ya incluye <#ID>, <@&ID> o <@ID>, Discord
 * los interpreta solo, así que no los tocamos.
 */
function applyWelcomeTemplate(template, { member, guild, shortName }) {
  const user = member.user;
  const serverName = shortName || guild.name;
  const memberCount = guild.memberCount ?? 0;

  let content = template;

  // Placeholders básicos
  content = content
    .replace(/\{user\}/gi, user.username)
    .replace(/\{mention\}/gi, `${member}`)
    .replace(/\{server\}/gi, serverName)
    .replace(/\{membercount\}/gi, String(memberCount));

  // Placeholders de ID -> menciones
  // {channel:1234567890} => <#1234567890>
  content = content.replace(/\{channel:(\d+)\}/gi, '<#$1>');

  // {role:1234567890} => <@&1234567890>
  content = content.replace(/\{role:(\d+)\}/gi, '<@&$1>');

  // {user:1234567890} => <@1234567890>
  content = content.replace(/\{user:(\d+)\}/gi, '<@$1>');

  return content;
}

module.exports = {
  applyWelcomeTemplate
};

// src/services/rolePanelService.js
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const pool = require('../config/database');
const logger = require('../config/logger');

/* ───────────────────────────────────────── */
/* DB helpers                                */
/* ───────────────────────────────────────── */

async function getRolePanelByGuild(guildId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM role_panels WHERE guild_id = ?',
      [guildId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error en getRolePanelByGuild:', err);
    return null;
  }
}

async function upsertRolePanel(guildId, channelId, panelTitle, panelBody) {
  const sql = `
    INSERT INTO role_panels (guild_id, channel_id, message_id, panel_title, panel_body)
    VALUES (?, ?, NULL, ?, ?)
    ON DUPLICATE KEY UPDATE
      channel_id   = VALUES(channel_id),
      panel_title  = VALUES(panel_title),
      panel_body   = VALUES(panel_body),
      updated_at   = CURRENT_TIMESTAMP
  `;
  try {
    await pool.execute(sql, [guildId, channelId, panelTitle, panelBody]);
    const panel = await getRolePanelByGuildAndChannel(guildId, channelId);
    return panel;
  } catch (err) {
    logger.error('Error en upsertRolePanel:', err);
    throw err;
  }
}


async function updatePanelMessageId(panelId, messageId) {
  try {
    await pool.execute(
      'UPDATE role_panels SET message_id = ? WHERE id = ?',
      [messageId, panelId]
    );
  } catch (err) {
    logger.error('Error en updatePanelMessageId:', err);
  }
}

async function addRolePanelButton(panelId, roleId, label, emoji, style) {
  const sql = `
    INSERT INTO role_panel_buttons (panel_id, role_id, label, emoji, style)
    VALUES (?, ?, ?, ?, ?)
  `;
  try {
    await pool.execute(sql, [panelId, roleId, label, emoji || null, style]);
  } catch (err) {
    logger.error('Error en addRolePanelButton:', err);
    throw err;
  }
}

async function getButtonsByPanel(panelId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM role_panel_buttons WHERE panel_id = ? ORDER BY id',
      [panelId]
    );
    return rows;
  } catch (err) {
    logger.error('Error en getButtonsByPanel:', err);
    return [];
  }
}

async function getButtonByIdForPanel(panelId, buttonId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM role_panel_buttons WHERE id = ? AND panel_id = ?',
      [buttonId, panelId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error en getButtonByIdForPanel:', err);
    return null;
  }
}

async function deleteRolePanelButton(panelId, buttonId) {
  try {
    await pool.execute(
      'DELETE FROM role_panel_buttons WHERE id = ? AND panel_id = ?',
      [buttonId, panelId]
    );
  } catch (err) {
    logger.error('Error en deleteRolePanelButton:', err);
    throw err;
  }
}

async function updateRolePanelButton(panelId, buttonId, { label, emoji, style, roleId }) {
  const fields = [];
  const values = [];

  if (label !== undefined) {
    fields.push('label = ?');
    values.push(label);
  }
  if (emoji !== undefined) {
    fields.push('emoji = ?');
    values.push(emoji || null);
  }
  if (style !== undefined) {
    fields.push('style = ?');
    values.push(style);
  }
  if (roleId !== undefined) {
    fields.push('role_id = ?');
    values.push(roleId);
  }

  if (!fields.length) return;

  const sql = `
    UPDATE role_panel_buttons
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND panel_id = ?
  `;
  values.push(buttonId, panelId);

  try {
    await pool.execute(sql, values);
  } catch (err) {
    logger.error('Error en updateRolePanelButton:', err);
    throw err;
  }
}

/* ───────────────────────────────────────── */
/* Utilidades de estilo / emoji              */
/* ───────────────────────────────────────── */

function mapStyle(styleStr) {
  switch ((styleStr || '').toLowerCase()) {
    case 'primary': return ButtonStyle.Primary;
    case 'success': return ButtonStyle.Success;
    case 'danger':  return ButtonStyle.Danger;
    case 'secondary':
    default:
      return ButtonStyle.Secondary;
  }
}

/**
 * Parsea un string de emoji y lo convierte a formato válido para Discord:
 *  - Unicode: "🔔"  => { name: '🔔' }
 *  - Custom: "<:name:123>" o "<a:name:123>" => { id, name, animated }
 * Si es inválido, devuelve null.
 */
function resolveButtonEmoji(raw) {
  if (!raw) return null;
  const emoji = raw.trim();
  if (!emoji) return null;

  // Custom emoji <a:name:id> o <:name:id>
  const customMatch = emoji.match(/^<a?:([^:]+):(\d+)>$/);
  if (customMatch) {
    const name = customMatch[1];
    const id = customMatch[2];
    const animated = emoji.startsWith('<a:');
    return { id, name, animated };
  }

  // Si contiene caracteres raros para un unicode + no es custom → inválido
  if (emoji.includes('<') || emoji.includes('>')) {
    return null;
  }

  // Asumimos que es un emoji unicode válido
  return { name: emoji };
}

/* ───────────────────────────────────────── */
/* Construcción del embed + botones          */
/* ───────────────────────────────────────── */

async function buildRolePanelMessage(client, panel) {
  const guild = client.guilds.cache.get(panel.guild_id);
  if (!guild) return null;

  const buttons = await getButtonsByPanel(panel.id);
  const icon = guild.iconURL({ size: 256 }) || null;

  // Título y descripción del panel
  const title =
    (panel.panel_title && panel.panel_title.trim().length > 0)
      ? panel.panel_title.trim()
      : 'Selecciona tus roles';

  const body =
    (panel.panel_body && panel.panel_body.trim().length > 0)
      ? panel.panel_body.trim()
      : '';

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setFooter({ text: `Panel de Roles - ${guild.name}` });

  // Icono del servidor a la izquierda del título
  if (icon) {
    embed.setAuthor({
      name: title,
      iconURL: icon
    });
  } else {
    // fallback si no tiene icono
    embed.setTitle(title);
  }

  if (body) {
    embed.setDescription(body);
  }

  const rows = [];
  if (buttons.length) {
    const chunks = [];
    for (let i = 0; i < buttons.length; i += 5) {
      chunks.push(buttons.slice(i, i + 5));
    }

    for (const chunk of chunks) {
      const row = new ActionRowBuilder();
      for (const btn of chunk) {
        const button = new ButtonBuilder()
          .setCustomId(`rolepanel:${panel.id}:${btn.id}`)
          .setLabel(btn.label)
          .setStyle(mapStyle(btn.style));

        // Emojis en los botones (sigues usando tu resolveButtonEmoji)
        if (btn.emoji) {
          const resolved = resolveButtonEmoji(btn.emoji);
          if (resolved) {
            button.setEmoji(resolved);
          } else {
            logger.warn(
              `Emoji inválido "${btn.emoji}" en botón ${btn.id} del panel ${panel.id}, se omite el emoji.`
            );
          }
        }

        row.addComponents(button);
      }
      rows.push(row);
    }
  }

  return { embeds: [embed], components: rows };
}



/**
 * Elimina el mensaje anterior (si existe) y reenvía el panel.
 */
async function sendOrUpdateRolePanel(client, panel) {
  try {
    const guild = client.guilds.cache.get(panel.guild_id);
    if (!guild) return;

    const channel = guild.channels.cache.get(panel.channel_id);
    if (!channel || !channel.isTextBased()) return;

    if (panel.message_id) {
      try {
        const oldMsg = await channel.messages.fetch(panel.message_id);
        if (oldMsg) {
          await oldMsg.delete().catch(() => {});
        }
      } catch {
        // mensaje ya no existe, ignorar
      }
    }

    const payload = await buildRolePanelMessage(client, panel);
    if (!payload) return;

    const msg = await channel.send(payload);
    await updatePanelMessageId(panel.id, msg.id);

    logger.info(
      `Panel de roles enviado/actualizado en guild ${panel.guild_id}, canal ${panel.channel_id}`
    );
  } catch (err) {
    logger.error('Error en sendOrUpdateRolePanel:', err);
  }
}

/**
 * Reenvía todos los paneles de todos los servidores al iniciar el bot.
 */
async function reloadAllRolePanels(client) {
  try {
    const [rows] = await pool.execute('SELECT * FROM role_panels');
    if (!rows.length) return;

    logger.info(`Recargando ${rows.length} panel(es) de roles al iniciar...`);

    for (const panel of rows) {
      await sendOrUpdateRolePanel(client, panel);
    }
  } catch (err) {
    logger.error('Error en reloadAllRolePanels:', err);
  }
}

/**
 * Maneja la interacción de un botón (toggle de rol).
 */
async function handleRolePanelButton(interaction) {
  try {
    const [_, panelIdStr, buttonIdStr] = interaction.customId.split(':');
    const panelId = Number(panelIdStr);
    const buttonId = Number(buttonIdStr);

    if (!panelId || !buttonId) return;

    const [rows] = await pool.execute(
      `SELECT b.*, p.guild_id
       FROM role_panel_buttons b
       JOIN role_panels p ON p.id = b.panel_id
       WHERE b.id = ? AND p.id = ?`,
      [buttonId, panelId]
    );

    const btn = rows[0];
    if (!btn) {
      await interaction.reply({
        content: '⚠️ Este botón ya no está configurado.',
        flags: 64
      });
      return;
    }

    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(btn.role_id);

    if (!role) {
      await interaction.reply({
        content: '⚠️ El rol asociado a este botón ya no existe.',
        flags: 64
      });
      return;
    }

    const hasRole = member.roles.cache.has(role.id);

    if (hasRole) {
      await member.roles.remove(role.id, 'RolePanel: quitar rol');
      await interaction.reply({
        content: `✅ Rol ${role} removido.`,
        flags: 64
      });
    } else {
      await member.roles.add(role.id, 'RolePanel: asignar rol');
      await interaction.reply({
        content: `✅ Rol ${role} asignado.`,
        flags: 64
      });
    }
  } catch (err) {
    logger.error('Error en handleRolePanelButton:', err);
    try {
      await interaction.reply({
        content: '❌ Ocurrió un error gestionando tu rol.',
        flags: 64
      });
    } catch {
      // ignore
    }
  }
}

async function getRolePanelByGuildAndChannel(guildId, channelId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM role_panels WHERE guild_id = ? AND channel_id = ?',
      [guildId, channelId]
    );
    return rows[0] || null;
  } catch (err) {
    logger.error('Error en getRolePanelByGuildAndChannel:', err);
    return null;
  }
}


module.exports = {
  getRolePanelByGuild,
  getRolePanelByGuildAndChannel,
  upsertRolePanel,
  addRolePanelButton,
  getButtonsByPanel,
  getButtonByIdForPanel,
  deleteRolePanelButton,
  updateRolePanelButton,
  sendOrUpdateRolePanel,
  reloadAllRolePanels,
  handleRolePanelButton
};

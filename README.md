# BenyiiHub — Bot de Discord

Bot de Discord modular desarrollado en **Node.js** con **discord.js v14**, base de datos **MySQL** y arquitectura por capas. Pensado para gestión avanzada de servidores de gaming/streaming.

---

## Características

### Sistema de actividad y ranking
- Conteo de mensajes y tiempo en canales de voz por usuario
- Cálculo de XP y niveles automático (5 XP/mensaje, 1 XP/min en voz)
- Anuncio de subida de nivel en canal configurable
- Blacklist de canales de voz excluidos del conteo (`/voiceblacklist`)
- Leaderboard con top N usuarios (`/leaderboard`)
- Tarjeta de rango personalizada con canvas (`/rank`)

### Logs de eventos
Tres canales de log independientes configurables por servidor:

| Canal | Eventos |
|---|---|
| **Log principal** | Errores y estado del bot, Twitch |
| **User event log** | Mensajes borrados/editados, conexiones de voz |
| **Admin event log** | Bans, kicks, cambios de roles/canales, timeouts, moves forzados |

Cada tipo de log puede activarse/desactivarse independientemente.

### Canales de voz dinámicos
- Sistema nuevo (por BD): categorías y canales configurables con `/setcategorydynamicchannel` y `/setcreatedynamicvoicechannel`
- Los canales se crean al entrar al canal "creador" y se eliminan automáticamente al quedar vacíos

### Bienvenida y despedida
- Imagen de bienvenida/despedida generada con canvas
- Mensaje personalizable con placeholders: `{user}`, `{mention}`, `{server}`, `{membercount}`, `{channel:ID}`, `{role:ID}`
- Mensaje de boost configurable

### Paneles de roles
- Paneles interactivos con botones para asignación/remoción de roles en self-service
- Múltiples paneles por servidor, múltiples botones por panel
- Estilos de botón: Primary, Secondary, Success, Danger
- Soporte de emojis custom y unicode

### Reclutamiento
- Panel con botón para postulación
- Modal con campos: nombre, UID, país, horario
- Crea automáticamente un canal de ticket privado con permisos para el postulante y roles de staff
- Estados de postulación: pending, accepted, rejected

### Twitch
- Seguimiento de múltiples streamers por servidor (`/twitch add/remove/list`)
- Notificación automática al pasar de offline → online con embed estilo Twitch
- Rol de ping configurable
- Comando de test manual (`/twitch test`)

### Auto roles
- Asignación automática de roles a nuevos miembros (`/autorole add/remove/list`)

### Normas
- Canal de normas con embed editable dinámicamente
- Comandos `/addrule` y `/removerule` actualizan el mensaje en vivo

### Changelog
- Canal de changelog con embeds (`/postchangelog`)

---

## Stack

| Tecnología | Versión |
|---|---|
| Node.js | 22+ |
| discord.js | v14 |
| MySQL | 8 |
| mysql2/promise | pool de 20 conexiones |
| @napi-rs/canvas | generación de imágenes |
| axios | Twitch API |
| dotenv | configuración por env |

---

## Instalación

```bash
npm install
```

Copia `.env.example` a `.env` y rellena los valores.

### Variables de entorno

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID_DEV=          # guild para deploy de comandos en desarrollo

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=discord_bot

SUPERADMIN=ID1,ID2     # IDs de Discord con acceso a comandos admin

TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_POLL_INTERVAL=60   # segundos entre checks (mínimo 20)

TICKET_STAFF_ROLES=ID1,ID2  # roles que ven los tickets de reclutamiento
```

---

## Scripts

```bash
npm start              # producción
npm run dev            # desarrollo con nodemon
npm run deploy-commands  # registrar slash commands en Discord
```

---

## Estructura

```
src/
├── commands/
│   ├── admin/         # Comandos de administración (requieren SUPERADMIN o Admin)
│   └── general/       # Comandos públicos: /rank, /leaderboard, /ping, /embed
├── events/            # Handlers de eventos de Discord
├── services/          # Lógica de negocio y acceso a BD
├── utils/             # Helpers: audit logs, embeds, diff de permisos, plantillas
└── config/            # database.js, config.js, logger.js, easterEggMessages.js
```

---

## Comandos slash

### Generales
| Comando | Descripción |
|---|---|
| `/rank [@usuario]` | Tarjeta de rango del usuario |
| `/leaderboard [limit]` | Top usuarios por XP |
| `/ping` | Latencia del bot |
| `/embed` | Enviar un embed personalizado |

### Admin — Logs
| Comando | Descripción |
|---|---|
| `/setlogchannel` | Canal de logs principal |
| `/setuserlogchannel` | Canal de logs de eventos de usuario |
| `/setadminlogchannel` | Canal de logs administrativos |
| `/userlogconfig` | Activar/desactivar tipos de user logs |
| `/userlogstatus` | Ver estado de los flags de user logs |
| `/adminlogconfig` | Activar/desactivar admin logs |
| `/testlog` | Enviar log de prueba |

### Admin — Bienvenida / Despedida
| Comando | Descripción |
|---|---|
| `/setwelcomechannel` | Canal de bienvenida |
| `/setwelcomemessage` | Mensaje de bienvenida con placeholders |
| `/setboostchannel` | Canal de anuncios de boost |
| `/setgoodbyechannel` | Canal de despedida |
| `/setgoodbyemessage` | Mensaje de despedida |
| `/setshortguildname` | Nombre corto del servidor (para imágenes) |
| `/testwelcome` | Simular bienvenida |
| `/testgoodbye` | Simular despedida |

### Admin — Twitch
| Comando | Descripción |
|---|---|
| `/twitch add [canal]` | Agregar streamer al seguimiento |
| `/twitch remove [canal]` | Quitar streamer |
| `/twitch list` | Listar streamers configurados |
| `/twitch test [canal?]` | Enviar alerta de prueba |
| `/setstreamchannel` | Canal de anuncios de streams |
| `/setstreampingrole` | Rol de ping para streams |
| `/setnewspingrole` | Rol de ping para noticias |

### Admin — Canales de voz dinámicos
| Comando | Descripción |
|---|---|
| `/setcategorydynamicchannel` | Configurar categoría para canales dinámicos |
| `/setcategoryvoicechannel` | Configurar categoría origen |
| `/setcreatedynamicvoicechannel` | Canal "creador" de salas dinámicas |
| `/voiceblacklist add [canal]` | Excluir canal del conteo de actividad |
| `/voiceblacklist remove [canal]` | Volver a incluir canal |
| `/voiceblacklist list` | Ver canales excluidos |

### Admin — Auto roles
| Comando | Descripción |
|---|---|
| `/autorole add [rol]` | Agregar rol automático para nuevos miembros |
| `/autorole remove [rol]` | Quitar rol automático |
| `/autorole list` | Listar roles automáticos |

### Admin — Paneles de roles
| Comando | Descripción |
|---|---|
| `/rolepanel_setup` | Crear panel de roles |
| `/rolepanel_listpanels` | Ver paneles en un canal |
| `/rolepanel_addbutton` | Agregar botón a un panel |
| `/rolepanel_editbutton` | Editar botón existente |
| `/rolepanel_removebutton` | Quitar botón |
| `/rolepanel_listbuttons` | Ver botones de un panel |
| `/rolepanel_removepanel` | Eliminar panel |

### Admin — Reclutamiento
| Comando | Descripción |
|---|---|
| `/setrecruitchannel` | Canal con el panel de postulación |
| `/setrecruitticketcategory` | Categoría para los tickets |
| `/closerecruitticket` | Cerrar ticket de reclutamiento |
| `/fixrecruitticketperms` | Reparar permisos de ticket |
| `/setapplicationstatus` | Cambiar estado de postulación |

### Admin — Normas y Changelog
| Comando | Descripción |
|---|---|
| `/setruleschannel` | Canal de normas |
| `/addrule [texto]` | Agregar norma |
| `/removerule [número]` | Quitar norma |
| `/setchangelogchannel` | Canal de changelog |
| `/postchangelog` | Publicar entrada de changelog |

### Admin — Niveles
| Comando | Descripción |
|---|---|
| `/levelupchannel` | Canal de anuncios de subida de nivel |

---

## Easter Eggs

El bot responde con mensajes aleatorios en DMs con cooldown configurable (`easterEggMessages.js`).

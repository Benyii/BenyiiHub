# 🧠 Discord Activity Bot  
Bot de Discord modular y escalable desarrollado en **Node.js**, utilizando arquitectura basada en capas **(MVC-like)**, almacenamiento en **MySQL**, y preparado para despliegue en **Docker**.

Incluye un completo sistema de **Slash Commands**, registros de actividad de usuarios, creación dinámica de canales de voz, y un leaderboard avanzado basado en mensajes y actividad en voz.

---

## 📌 Características principales

### 🔹 Slash Commands (/)
- Registro automático mediante `deploy-commands.js`
- Organización modular por carpetas

### 🔹 Leaderboard de actividad
Registra:
- Cantidad de mensajes enviados en el servidor
- Tiempo total conectado en canales de voz
- Cantidad de sesiones de voz
- Cálculo de score para ranking (`/top`)

### 🔹 Canales dinámicos (Join to Create)
- Cuando un usuario entra al canal configurado, se crea automáticamente un canal privado para él
- Se elimina cuando queda vacío
- Configurable desde `.env` (canal JTC, categoría y límite de usuarios)

### 🔹 Comando `/embed`
Envia mensajes embebidos personalizados:
- Título
- Descripción
- Color HEX

### 🔹 Conexión MySQL con pool
- Manejo eficiente de conexiones
- Tablas para guilds, estadísticas y canales dinámicos

### 🔹 Listo para Docker
Incluye:
- Dockerfile
- docker-compose.yml
- Inicialización automática de MySQL con schema

---

## 📦 Tecnologías utilizadas

- **Node.js 22+**
- **discord.js v14**
- **MySQL 8**
- **mysql2/promise**
- **dotenv**
- **Docker & docker-compose**
- Arquitectura tipo **MVC por capas**

---

## 📁 Estructura del proyecto

```text
discord-bot/
├─ src/
│  ├─ config/
│  │  ├─ config.js
│  │  ├─ database.js
│  │  └─ logger.js
│  ├─ commands/
│  │  ├─ general/
│  │  │  ├─ ping.js
│  │  │  └─ top.js
│  │  └─ admin/
│  │     └─ embed.js
│  ├─ events/
│  │  ├─ ready.js
│  │  ├─ interactionCreate.js
│  │  ├─ messageCreate.js
│  │  └─ voiceStateUpdate.js
│  ├─ services/
│  │  ├─ leaderboardService.js
│  │  └─ voiceChannelService.js
│  ├─ deploy-commands.js
│  └─ index.js
├─ sql/
│  └─ schema.sql
├─ .env
├─ Dockerfile
├─ docker-compose.yml
├─ .gitignore
└─ package.json

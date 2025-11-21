CREATE TABLE IF NOT EXISTS guild_levelup_settings (
  guild_id   VARCHAR(32) NOT NULL,
  channel_id VARCHAR(32) NOT NULL,
  PRIMARY KEY (guild_id)
) ENGINE=InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

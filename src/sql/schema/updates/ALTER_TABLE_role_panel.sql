ALTER TABLE role_panels
  ADD UNIQUE KEY uq_role_panels_guild_channel (guild_id, channel_id);

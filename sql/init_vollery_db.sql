-- init_vollery_db.sql
-- Drops the `vollery_server` database if it exists (terminates existing connections),
-- then creates a fresh `vollery_server` database.
-- Run this as a superuser connected to a maintenance DB (e.g. `postgres`).

-- Terminate all connections to the database so it can be dropped.
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'vollery_server'
  AND pid <> pg_backend_pid();

-- Drop the database if it exists
DROP DATABASE IF EXISTS vollery_server;

-- Create a new database. Adjust OWNER, ENCODING, or locale as needed.
CREATE DATABASE vollery_server
  WITH OWNER = postgres
       ENCODING = 'UTF8'
       LC_COLLATE = 'en_US.UTF-8'
       LC_CTYPE = 'en_US.UTF-8'
       TEMPLATE = template0;

-- Note:
-- - Run this script from a superuser session (for example: `psql -U postgres -d postgres -f sql/init_vollery_db.sql`).
-- - Dropping the database removes all objects that belonged to it.
-- - If your environment uses a different locale or owner, adjust the CREATE DATABASE options accordingly.

-- PostgreSQL initialization script
-- This runs when the database is first created

-- Create app user with superuser privileges (needed for extensions and migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app') THEN
        CREATE ROLE app WITH LOGIN PASSWORD 'app' SUPERUSER CREATEDB;
        RAISE NOTICE 'Created app user with superuser privileges';
    ELSE
        -- Make sure app is a superuser
        ALTER ROLE app WITH SUPERUSER;
        RAISE NOTICE 'Updated app user to superuser';
    END IF;
END
$$;

-- Create appdb database owned by app
SELECT 'CREATE DATABASE appdb OWNER app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'appdb')\gexec

-- Install required PostgreSQL extensions
\c appdb
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

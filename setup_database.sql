-- Database setup script for Edforce
-- Run this as the postgres superuser

-- Create the database with default collation
CREATE DATABASE edforce_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    TEMPLATE = template0;

-- Connect to the new database and create extensions if needed
\c edforce_db;

-- Create UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create some useful extensions for future use
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For password hashing
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- For text searching

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE edforce_db TO postgres;

-- Display success message
SELECT 'Database edforce_db created successfully!' as message;
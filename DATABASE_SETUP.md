# Database Setup Instructions

## Option 1: Using Docker (Recommended)

1. **Install Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop

2. **Start PostgreSQL Database**
   ```bash
   cd d:\Edforce
   docker-compose up -d postgres
   ```

3. **Verify Database Connection**
   ```bash
   docker exec -it crm-postgres psql -U postgres -d edforce_db
   ```

## Option 2: Manual PostgreSQL Installation

1. **Download PostgreSQL 15+**
   - Download from: https://www.postgresql.org/download/windows/
   - Install with default settings
   - Remember the password for 'postgres' user

2. **Create Database**
   ```sql
   CREATE DATABASE edforce_db;
   CREATE USER postgres WITH PASSWORD 'postgres';
   GRANT ALL PRIVILEGES ON DATABASE edforce_db TO postgres;
   ```

3. **Update Environment Variables**
   ```bash
   # In backend/.env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=your_password_here
   DATABASE_NAME=edforce_db
   ```

## Option 3: Online PostgreSQL Service

1. **ElephantSQL (Free Tier)**
   - Sign up at: https://www.elephantsql.com/
   - Create a new instance
   - Copy connection details to .env

2. **Supabase (Free Tier)**
   - Sign up at: https://supabase.com/
   - Create new project
   - Get database URL from settings

## Testing Database Connection

After setting up the database, test the connection:

```bash
cd backend
npm run build
npm run migration:run
```

## Current Configuration

The system is configured to connect to:
- Host: localhost
- Port: 5432
- Database: edforce_db
- Username: postgres
- Password: postgres

Update the `.env` file in the backend directory with your actual database credentials.
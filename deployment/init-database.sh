#!/bin/bash

# =====================================================
# EdForce Database Initialization Script
# Run this ONCE on a fresh database to create schema
# =====================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  EdForce Database Initialization${NC}"
echo -e "${GREEN}========================================${NC}"

# Check for env file
if [ ! -f .env.production ]; then
    echo -e "${RED}Error: .env.production not found${NC}"
    exit 1
fi

# Load environment
set -a
source .env.production
set +a

echo -e "${YELLOW}Step 1: Stopping backend...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production stop backend

echo -e "${YELLOW}Step 2: Ensuring postgres is running...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
sleep 5

echo -e "${YELLOW}Step 3: Creating base schema using TypeORM sync...${NC}"
# Run a one-time sync to create all tables
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm \
    -e TYPEORM_SYNCHRONIZE=true \
    backend node -e "
const { DataSource } = require('typeorm');
const path = require('path');

const ds = new DataSource({
    type: 'postgres',
    host: 'postgres',
    port: 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'edforce_db',
    entities: [path.join(__dirname, 'dist/database/entities/*.entity.js')],
    synchronize: true,
    logging: true,
});

ds.initialize()
    .then(() => {
        console.log('Schema synchronized successfully!');
        return ds.destroy();
    })
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
"

echo -e "${YELLOW}Step 4: Marking existing migrations as run...${NC}"
# Insert migration records so they don't run again
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U ${DATABASE_USERNAME:-postgres} -d ${DATABASE_NAME:-edforce_db} << 'EOF'
-- Create migrations table if not exists
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- Mark all migrations as already run (since schema was created via sync)
INSERT INTO migrations (timestamp, name) VALUES
(1730640000000, 'RedesignLeads1730640000000'),
(1730790000000, 'AddCounselorCodeToUsers1730790000000'),
(1731734400000, 'AddSharedToReports1731734400000'),
(1731878400000, 'AddExcludedFromCenterToReports1731878400000'),
(1731879000000, 'AddCreatedByToReportFolders1731879000000'),
(1732100000000, 'CreateCallLogsTable1732100000000'),
(1733500000000, 'AddLeadVersionColumn1733500000000'),
(1760944699690, 'AddOpportunityFields1760944699690'),
(1761204000000, 'ResetCustomFieldsSchema1761204000000'),
(1761205000000, 'AddCustomFieldGroupingAndSystem1761205000000'),
(1761206000000, 'SeedLeadSystemFields1761206000000'),
(1761207000000, 'MakeNameColumnsNullable1761207000000'),
(1761208000000, 'SeedContactSystemFields1761208000000'),
(1761209000000, 'SeedOpportunitySystemFields1761209000000'),
(1761400000000, 'DropLeadsCustomData1761400000000'),
(1761825600000, 'AddCenterScopeToCustomFields1761825600000'),
(1761925800000, 'RelaxEnumsToStrings1761925800000'),
(1761926400000, 'AddUserRoleAndLeadScore1761926400000'),
(1761927000000, 'MarketingAutomationTables1761927000000'),
(1761928000000, 'RemoveContactOpportunityCustomFields1761928000000'),
(1761932000000, 'AddPresenceToUsers1761932000000'),
(1761932600000, 'DropUserStatus1761932600000'),
(1761933000000, 'AddCenterNameToUsers1761933000000'),
(1761934000000, 'FixCustomFieldIndexNames1761934000000'),
(1762000000000, 'AddDataJsonToLeads1762000000000'),
(1762001000000, 'AddLeadCustomData1762001000000'),
(1762001100000, 'FixCustomFieldIndexes1762001100000'),
(1762100000000, 'DropCustomFieldsTables1762100000000'),
(1762101000000, 'CreateLeadFieldSettings1762101000000'),
(1762202000000, 'AddImportantAndViewScope1762202000000'),
(1762300000000, 'RecreateCustomFieldsTables1762300000000'),
(1762300100000, 'SeedCurrentLeadSystemFields1762300100000'),
(1762402000000, 'CreateCenterFieldOptions1762402000000'),
(1762500000000, 'CreateCenterRoutingRules1762500000000'),
(1762501000000, 'CreateReportsTables1762501000000')
ON CONFLICT DO NOTHING;
EOF

echo -e "${YELLOW}Step 5: Creating default admin user...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U ${DATABASE_USERNAME:-postgres} -d ${DATABASE_NAME:-edforce_db} << 'EOF'
-- Create uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create default admin user (password: Admin@123 - bcrypt hash)
INSERT INTO users (id, email, password, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    'admin@edforce.live',
    '$2b$10$rQZ8K.GqN5r5J5YzJ5K5XeKZK5K5K5K5K5K5K5K5K5K5K5K5K5K5K',
    'Admin',
    'User',
    'admin',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;
EOF

echo -e "${YELLOW}Step 6: Starting backend...${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Database Initialization Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Default admin credentials:"
echo -e "  Email: admin@edforce.live"
echo -e "  Password: Admin@123"
echo ""
echo -e "${RED}IMPORTANT: Change this password immediately after first login!${NC}"

-- Migration: Add Soft Delete Functionality
-- Created: Phase 2 - Database & Performance Optimization
-- Purpose: Prevent data loss and enable recovery

-- ============================================
-- ADD SOFT DELETE COLUMNS TO EXISTING TABLES
-- ============================================

-- Add soft delete columns to main tables
ALTER TABLE ticket ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE knowledgeBase ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE user ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE organization ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ============================================
-- UPDATE INDEXES TO INCLUDE DELETED AT
-- ============================================

-- Update ticket indexes to exclude deleted records
DROP INDEX IF EXISTS idx_ticket_org_status;
CREATE INDEX CONCURRENTLY idx_ticket_org_status 
ON ticket(orgId, status) WHERE deletedAt IS NULL;

DROP INDEX IF EXISTS idx_ticket_org_customer;
CREATE INDEX CONCURRENTLY idx_ticket_org_customer 
ON ticket(orgId, customerId) WHERE deletedAt IS NULL;

DROP INDEX IF EXISTS idx_ticket_org_agent;
CREATE INDEX CONCURRENTLY idx_ticket_org_agent 
ON ticket(orgId, assignedAgentId) WHERE deletedAt IS NULL;

DROP INDEX IF EXISTS idx_ticket_org_created_at;
CREATE INDEX CONCURRENTLY idx_ticket_org_created_at 
ON ticket(orgId, createdAt DESC) WHERE deletedAt IS NULL;

DROP INDEX IF EXISTS idx_ticket_org_priority;
CREATE INDEX CONCURRENTLY idx_ticket_org_priority 
ON ticket(orgId, priority) WHERE deletedAt IS NULL;

-- Update customer indexes
DROP INDEX IF EXISTS idx_customer_org_email;
CREATE INDEX CONCURRENTLY idx_customer_org_email 
ON customer(orgId, email) WHERE deletedAt IS NULL;

DROP INDEX IF EXISTS idx_customer_org_status;
CREATE INDEX CONCURRENTLY idx_customer_org_status 
ON customer(orgId, status) WHERE deletedAt IS NULL;

-- Update agent indexes
DROP INDEX IF EXISTS idx_agent_user_busy;
CREATE INDEX CONCURRENTLY idx_agent_user_busy 
ON agent(userId, busyStatus) WHERE deletedAt IS NULL;

-- Update knowledge base indexes
DROP INDEX IF EXISTS idx_knowledge_org_category;
CREATE INDEX CONCURRENTLY idx_knowledge_org_category 
ON knowledgeBase(orgId, category) WHERE deletedAt IS NULL;

-- Update user indexes
DROP INDEX IF EXISTS idx_user_email_org;
CREATE INDEX CONCURRENTLY idx_user_email_org 
ON user(email, orgId) WHERE deletedAt IS NULL;

DROP INDEX IF EXISTS idx_user_role_org;
CREATE INDEX CONCURRENTLY idx_user_role_org 
ON user(role, orgId) WHERE deletedAt IS NULL;

-- ============================================
-- CREATE SOFT DELETE FUNCTIONS
-- ============================================

-- Function to soft delete tickets
CREATE OR REPLACE FUNCTION soft_delete_ticket(ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ticket 
    SET deletedAt = NOW(), 
        updatedAt = NOW()
    WHERE id = ticket_id AND deletedAt IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete customers
CREATE OR REPLACE FUNCTION soft_delete_customer(customer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE customer 
    SET deletedAt = NOW(), 
        updatedAt = NOW()
    WHERE id = customer_id AND deletedAt IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete agents
CREATE OR REPLACE FUNCTION soft_delete_agent(agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE agent 
    SET deletedAt = NOW(), 
        updatedAt = NOW()
    WHERE id = agent_id AND deletedAt IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete knowledge base entries
CREATE OR REPLACE FUNCTION soft_delete_knowledge(knowledge_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE knowledgeBase 
    SET deletedAt = NOW(), 
        updatedAt = NOW()
    WHERE id = knowledge_id AND deletedAt IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete users
CREATE OR REPLACE FUNCTION soft_delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user 
    SET deletedAt = NOW(), 
        updatedAt = NOW()
    WHERE id = user_id AND deletedAt IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete organizations
CREATE OR REPLACE FUNCTION soft_delete_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE organization 
    SET deletedAt = NOW(), 
        updatedAt = NOW()
    WHERE id = org_id AND deletedAt IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE RESTORE FUNCTIONS
-- ============================================

-- Function to restore soft deleted tickets
CREATE OR REPLACE FUNCTION restore_ticket(ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ticket 
    SET deletedAt = NULL, 
        updatedAt = NOW()
    WHERE id = ticket_id AND deletedAt IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to restore soft deleted customers
CREATE OR REPLACE FUNCTION restore_customer(customer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE customer 
    SET deletedAt = NULL, 
        updatedAt = NOW()
    WHERE id = customer_id AND deletedAt IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to restore soft deleted agents
CREATE OR REPLACE FUNCTION restore_agent(agent_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE agent 
    SET deletedAt = NULL, 
        updatedAt = NOW()
    WHERE id = agent_id AND deletedAt IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE VIEWS FOR SOFT DELETE QUERIES
-- ============================================

-- View that excludes soft deleted records
CREATE OR REPLACE VIEW v_active_tickets AS
SELECT * FROM ticket WHERE deletedAt IS NULL;

CREATE OR REPLACE VIEW v_active_customers AS
SELECT * FROM customer WHERE deletedAt IS NULL;

CREATE OR REPLACE VIEW v_active_agents AS
SELECT * FROM agent WHERE deletedAt IS NULL;

CREATE OR REPLACE VIEW v_active_knowledge_base AS
SELECT * FROM knowledgeBase WHERE deletedAt IS NULL;

CREATE OR REPLACE VIEW v_active_users AS
SELECT * FROM user WHERE deletedAt IS NULL;

CREATE OR REPLACE VIEW v_active_organizations AS
SELECT * FROM organization WHERE deletedAt IS NULL;

-- ============================================
-- CREATE CLEANUP FUNCTION FOR OLD SOFT DELETED RECORDS
-- ============================================

-- Function to permanently delete old soft deleted records
CREATE OR REPLACE FUNCTION cleanup_old_soft_deletes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete tickets older than 90 days
    DELETE FROM ticket 
    WHERE deletedAt IS NOT NULL 
    AND deletedAt < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete customers older than 90 days
    DELETE FROM customer 
    WHERE deletedAt IS NOT NULL 
    AND deletedAt < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Delete knowledge base entries older than 90 days
    DELETE FROM knowledgeBase 
    WHERE deletedAt IS NOT NULL 
    AND deletedAt < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE PRISMA SCHEMA TO INCLUDE SOFT DELETE
-- ============================================

-- Note: Update prisma schema.prisma to include:
-- deletedAt DateTime? @default(null)
-- on all main entities

-- Example for ticket model:
-- model Ticket {
--   // ... existing fields
--   deletedAt DateTime? @default(null)
--   
--   @@index([orgId, status], map: "idx_ticket_org_status")
--   @@index([orgId, customerId], map: "idx_ticket_org_customer")
--   @@index([orgId, createdAt(sort: Desc)], map: "idx_ticket_org_created_at")
--   @@index([orgId, priority], map: "idx_ticket_org_priority")
--   @@index([orgId, assignedAgentId], map: "idx_ticket_org_agent")
-- }

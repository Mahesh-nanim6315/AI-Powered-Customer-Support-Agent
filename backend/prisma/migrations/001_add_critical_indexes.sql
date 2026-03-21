-- Migration: Add Critical Database Indexes for Performance
-- Created: Phase 2 - Database & Performance Optimization
-- Purpose: Optimize queries for production workload

-- ============================================
-- ORGANIZATION INDEXES
-- ============================================

-- Index for organization lookups by email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_email 
ON organization(email);

-- Index for subscription tier queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_subscription_tier 
ON organization(subscriptionTier);

-- ============================================
-- USER INDEXES
-- ============================================

-- Composite index for user authentication and organization lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email_org 
ON user(email, orgId);

-- Index for role-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_org 
ON user(role, orgId);

-- ============================================
-- CUSTOMER INDEXES
-- ============================================

-- Composite index for customer lookups (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_org_email 
ON customer(orgId, email);

-- Index for customer status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_org_status 
ON customer(orgId, status);

-- Index for customer user association
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_user_id 
ON customer(userId);

-- ============================================
-- TICKET INDEXES (Critical for Performance)
-- ============================================

-- Primary composite index for ticket queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_org_status 
ON ticket(orgId, status);

-- Index for customer ticket lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_org_customer 
ON ticket(orgId, customerId);

-- Index for agent assignment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_org_agent 
ON ticket(orgId, assignedAgentId);

-- Index for ticket creation time sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_org_created_at 
ON ticket(orgId, createdAt DESC);

-- Index for ticket priority filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_org_priority 
ON ticket(orgId, priority);

-- Index for ticket creator lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_org_created_by 
ON ticket(orgId, createdByUserId);

-- ============================================
-- TICKET MESSAGE INDEXES
-- ============================================

-- Index for message queries by ticket
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_message_ticket_created 
ON ticketMessage(ticketId, createdAt DESC);

-- Index for message role filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_message_ticket_role 
ON ticketMessage(ticketId, role);

-- ============================================
-- AGENT INDEXES
-- ============================================

-- Index for agent availability queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_user_busy 
ON agent(userId, busyStatus);

-- Index for agent load balancing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_org_active_tickets 
ON agent(userId, activeTickets);

-- ============================================
-- KNOWLEDGE BASE INDEXES
-- ============================================

-- Index for knowledge base search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_org_category 
ON knowledgeBase(orgId, category);

-- Full-text search index for knowledge base content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_org_content 
ON knowledgeBase(orgId, title, content);

-- ============================================
-- AI SUGGESTIONS INDEXES
-- ============================================

-- Index for suggestion queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_suggestion_org_status 
ON aiSuggestion(orgId, status);

-- Index for ticket-specific suggestions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_suggestion_ticket_status 
ON aiSuggestion(ticketId, status);

-- ============================================
-- ANALYTICS INDEXES
-- ============================================

-- Index for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_analytics_ticket 
ON ticketAnalytics(ticketId);

-- ============================================
-- AUDIT LOG INDEXES (Future Use)
-- ============================================

-- Index for audit trail queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_audit_org_ticket_created 
ON ticketAuditLog(orgId, ticketId, createdAt DESC);

-- ============================================
-- INVITE INDEXES
-- ============================================

-- Index for invite lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_org_email 
ON invite(orgId, email);

-- Index for invite status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_org_status 
ON invite(orgId, status);

-- Index for invite expiration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invite_expires_at 
ON invite(expiresAt);

-- ============================================
-- CUSTOMER INVITE TOKEN INDEXES
-- ============================================

-- Index for customer invite tokens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invite_org_email 
ON customerInviteToken(orgId, email);

-- Index for token expiration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_invite_expires_at 
ON customerInviteToken(expiresAt);

-- ============================================
-- REFUND INDEXES
-- ============================================

-- Index for refund queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refund_ticket_status 
ON refund(ticketId, status);

-- ============================================
-- PERFORMANCE ANALYSIS QUERIES
-- ============================================

-- Query to analyze index usage (run after migration)
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY idx_scan DESC, idx_tup_read DESC;

-- Query to find slow queries (run after migration)
-- SELECT 
--     query,
--     calls,
--     total_time,
--     mean_time,
--     rows
-- FROM pg_stat_statements 
-- WHERE mean_time > 100 
-- ORDER BY mean_time DESC 
-- LIMIT 10;

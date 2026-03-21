-- Migration: Add Audit Trail System
-- Created: Phase 2 - Database & Performance Optimization
-- Purpose: Track all data changes for compliance and debugging

-- ============================================
-- TICKET AUDIT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS ticket_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticketId UUID NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
    userId UUID NOT NULL REFERENCES user(id) ON DELETE SET NULL,
    orgId UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- CREATED, UPDATED, STATUS_CHANGED, ASSIGNED, MESSAGE_ADDED, etc.
    oldValue JSONB, -- Previous state (for updates)
    newValue JSONB, -- New state (for updates)
    metadata JSONB, -- Additional context (IP address, user agent, etc.)
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT fk_ticket_audit_ticket FOREIGN KEY (ticketId) REFERENCES ticket(id),
    CONSTRAINT fk_ticket_audit_user FOREIGN KEY (userId) REFERENCES user(id),
    CONSTRAINT fk_ticket_audit_org FOREIGN KEY (orgId) REFERENCES organization(id)
);

-- Indexes for audit log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_audit_org_ticket_created 
ON ticket_audit_log(orgId, ticketId, createdAt DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_audit_action_created 
ON ticket_audit_log(action, createdAt DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_audit_user_created 
ON ticket_audit_log(userId, createdAt DESC);

-- ============================================
-- USER ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    orgId UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, TICKET_VIEWED, MESSAGE_SENT, etc.
    resourceType VARCHAR(50), -- TICKET, CUSTOMER, KNOWLEDGE_BASE, etc.
    resourceId UUID, -- ID of the resource being acted upon
    details JSONB, -- Additional context
    ipAddress INET,
    userAgent TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT fk_user_activity_user FOREIGN KEY (userId) REFERENCES user(id),
    CONSTRAINT fk_user_activity_org FOREIGN KEY (orgId) REFERENCES organization(id)
);

-- Indexes for user activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_org_user_created 
ON user_activity_log(orgId, userId, createdAt DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_action_created 
ON user_activity_log(action, createdAt DESC);

-- ============================================
-- SYSTEM EVENT LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS system_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eventType VARCHAR(50) NOT NULL, -- ERROR, WARNING, INFO, SECURITY_ALERT
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    message TEXT NOT NULL,
    details JSONB,
    source VARCHAR(100), -- API, WORKER, DATABASE, AUTH
    orgId UUID REFERENCES organization(id) ON DELETE SET NULL,
    userId UUID REFERENCES user(id) ON DELETE SET NULL,
    ipAddress INET,
    userAgent TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolvedAt TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    CONSTRAINT fk_system_event_org FOREIGN KEY (orgId) REFERENCES organization(id),
    CONSTRAINT fk_system_event_user FOREIGN KEY (userId) REFERENCES user(id)
);

-- Indexes for system events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_event_type_severity_created 
ON system_event_log(eventType, severity, createdAt DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_event_org_created 
ON system_event_log(orgId, createdAt DESC);

-- ============================================
-- DATA CHANGE LOG TABLE (General Purpose)
-- ============================================

CREATE TABLE IF NOT EXISTS data_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tableName VARCHAR(100) NOT NULL,
    recordId UUID NOT NULL,
    operation VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    oldValues JSONB,
    newValues JSONB,
    userId UUID REFERENCES user(id) ON DELETE SET NULL,
    orgId UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT fk_data_change_org FOREIGN KEY (orgId) REFERENCES organization(id)
);

-- Indexes for data change log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_change_table_record_created 
ON data_change_log(tableName, recordId, createdAt DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_change_org_created 
ON data_change_log(orgId, createdAt DESC);

-- ============================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC AUDITING
-- ============================================

-- Function to log ticket changes
CREATE OR REPLACE FUNCTION log_ticket_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO ticket_audit_log (ticketId, userId, orgId, action, newValue, metadata)
        VALUES (NEW.id, NEW.createdByUserId, NEW.orgId, 'CREATED', 
                row_to_json(NEW), 
                json_build_object('trigger', TG_NAME, 'operation', TG_OP));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO ticket_audit_log (ticketId, userId, orgId, action, oldValue, newValue, metadata)
        VALUES (NEW.id, COALESCE(NEW.createdByUserId, OLD.createdByUserId), NEW.orgId, 'UPDATED', 
                row_to_json(OLD), 
                row_to_json(NEW),
                json_build_object('trigger', TG_NAME, 'operation', TG_OP));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO ticket_audit_log (ticketId, userId, orgId, action, oldValue, metadata)
        VALUES (OLD.id, OLD.createdByUserId, OLD.orgId, 'DELETED', 
                row_to_json(OLD), 
                json_build_object('trigger', TG_NAME, 'operation', TG_OP));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticket audit logging
DROP TRIGGER IF EXISTS ticket_audit_trigger ON ticket;
CREATE TRIGGER ticket_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ticket
    FOR EACH ROW EXECUTE FUNCTION log_ticket_change();

-- ============================================
-- VIEWS FOR COMMON AUDIT QUERIES
-- ============================================

-- View for recent ticket activity
CREATE OR REPLACE VIEW v_recent_ticket_activity AS
SELECT 
    tal.id,
    tal.ticketId,
    tal.action,
    tal.oldValue,
    tal.newValue,
    tal.createdAt,
    u.email as userEmail,
    u.role as userRole,
    t.subject as ticketSubject,
    t.status as ticketStatus
FROM ticket_audit_log tal
JOIN user u ON tal.userId = u.id
LEFT JOIN ticket t ON tal.ticketId = t.id
ORDER BY tal.createdAt DESC;

-- View for user activity summary
CREATE OR REPLACE VIEW v_user_activity_summary AS
SELECT 
    u.id as userId,
    u.email as userEmail,
    u.role as userRole,
    COUNT(ual.id) as totalActivities,
    MAX(ual.createdAt) as lastActivity,
    COUNT(CASE WHEN ual.action = 'LOGIN' THEN 1 END) as loginCount
FROM user u
LEFT JOIN user_activity_log ual ON u.id = ual.userId
WHERE ual.createdAt >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.role;

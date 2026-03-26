import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { buildPgPoolConfig } from './pg';

// Performance-optimized database configuration
export const createOptimizedDatabase = () => {
  const pool = new Pool(
    buildPgPoolConfig({
      max: 10,
      min: 0,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'chitti-support-system',
    })
  );

  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    // Query optimization settings
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    
    // Transaction settings
    transactionOptions: {
      timeout: 10000, // 10 second transaction timeout
      isolationLevel: 'ReadCommitted', // Balance between consistency and performance
    },
    
    // Error formatting
    errorFormat: 'pretty',
  });
};

// Database health check function
export const checkDatabaseHealth = async () => {
  try {
    const db = createOptimizedDatabase();
    
    // Simple connection test
    await db.$queryRaw`SELECT 1`;
    
    // Check table counts
    const [ticketCount, userCount, orgCount] = await Promise.all([
      db.ticket.count(),
      db.user.count(),
      db.organization.count(),
    ]);
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        ticketCount,
        userCount,
        orgCount,
      }
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Query performance monitoring
export const monitorQueryPerformance = async (query: string, duration: number) => {
  if (duration > 1000) { // Log queries taking more than 1 second
    console.warn('Slow query detected:', {
      query,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    
    // In production, you might want to send this to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // await sendToMonitoringService({ type: 'slow_query', query, duration });
    }
  }
};

// Database connection monitoring
export const monitorConnectionPool = (pool: Pool) => {
  // Monitor pool status every 30 seconds
  setInterval(() => {
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;
    
    console.log('Database Pool Status:', {
      total: totalCount,
      idle: idleCount,
      waiting: waitingCount,
      timestamp: new Date().toISOString(),
    });
    
    // Alert if pool is under stress
    if (waitingCount > 5) {
      console.warn('Database connection pool under stress:', {
        waiting: waitingCount,
        total: totalCount,
      });
    }
  }, 30000);
};

// Batch operations for better performance
export const batchOperations = {
  // Batch insert tickets
  async insertTickets(tickets: any[]) {
    const db = createOptimizedDatabase();
    
    return db.ticket.createMany({
      data: tickets,
      skipDuplicates: true,
    });
  },
  
  // Batch update ticket statuses
  async updateTicketStatuses(updates: { id: string; status: string }[]) {
    const db = createOptimizedDatabase();
    
    const operations = updates.map(({ id, status }) => 
      db.ticket.update({
        where: { id },
        data: { status: status as any },
      })
    );
    
    return db.$transaction(operations);
  },
  
  // Batch customer creation
  async insertCustomers(customers: any[]) {
    const db = createOptimizedDatabase();
    
    return db.customer.createMany({
      data: customers,
      skipDuplicates: true,
    });
  },
};

// Export the optimized database instance
export const db = createOptimizedDatabase();

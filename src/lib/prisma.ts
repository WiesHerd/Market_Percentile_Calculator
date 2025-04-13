import { PrismaClient } from '@prisma/client';

// Add error handling for Prisma connection
function createPrismaClient() {
  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] as const
        : undefined
    });
    
    // Test connection
    client.$connect()
      .then(() => console.log('Successfully connected to database'))
      .catch(e => console.error('Failed to connect to database:', e));
      
    return client;
  } catch (e) {
    console.error('Error initializing Prisma client:', e);
    // Fall back to a new basic client if there was an error
    return new PrismaClient();
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

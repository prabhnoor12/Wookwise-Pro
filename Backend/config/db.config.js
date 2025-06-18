// Database configuration for Prisma/PostgreSQL

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const connectToDatabase = async () => {
    try {
        await prisma.$connect();
        console.log('Connected to PostgreSQL via Prisma');
    } catch (error) {
        console.error('Prisma connection error:', error);
        process.exit(1);
    }
};

// ...existing code...
export const dbConfig = {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydb?schema=public',
    connectionLimit: 10,
    ssl: process.env.DB_SSL === 'true',
};

export function getDatabaseUrl() {
    return dbConfig.url;
}

export default dbConfig;

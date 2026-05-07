// This module provides a minimal Prisma-based SQL pool for raw queries.
import { prisma } from "../prisma.js";

type QueryResult = {
  rows: any[];
  rowCount: number;
};

// A class that mimics the `pg` Pool API using Prisma's raw query functions.
class PrismaSqlPool {
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const normalized = sql.trim().toLowerCase();
    const isRead = normalized.startsWith("select") || normalized.startsWith("with");
    const hasReturning = /\breturning\b/i.test(normalized);

    // Use $queryRawUnsafe for read queries and write queries with RETURNING.
    if (isRead || hasReturning) {
      const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as any[];
      return { rows, rowCount: rows.length };
    }

    const rowCount = await prisma.$executeRawUnsafe(sql, ...params);
    return { rows: [], rowCount: Number(rowCount) || 0 };
  }
}

// Singleton instance of the PrismaSqlPool.
let pool: PrismaSqlPool | null = null;

// Returns the singleton instance of the PrismaSqlPool.
export function getPool() {
  if (!pool) pool = new PrismaSqlPool();
  return pool;
}

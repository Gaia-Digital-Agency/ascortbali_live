// This module initializes and exports the Prisma client.
import { PrismaClient } from "@prisma/client";

// Export a singleton instance of PrismaClient for database interactions.
export const prisma = new PrismaClient();

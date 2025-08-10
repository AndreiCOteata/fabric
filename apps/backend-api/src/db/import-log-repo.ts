import type { PrismaClient } from '@prisma/client';
import { ImportLogPort } from './import-log-port';

export class ImportLogRepo implements ImportLogPort {
    constructor(private prisma: PrismaClient) {}

    async get(query: string) {
        return this.prisma.importLog.findUnique({ where: { query } });
    }

    async markImported(query: string) {
        await this.prisma.importLog.upsert({
            where: { query },
            create: { query },
            update: { fetchedAt: new Date() },
        });
    }
}

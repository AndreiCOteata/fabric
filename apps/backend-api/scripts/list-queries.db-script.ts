import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const rows = await prisma.importLog.findMany({
        orderBy: { id: 'asc' },
    });
    // Shape for output
    const queries = rows.map(r => ({
        id: r.id,
        query: r.query,
        fetchedAt: r.fetchedAt
    }));

    // Pretty console output
    console.log(`Found ${queries.length} posters\n`);
    console.table(
        queries.map(q => ({
            queryId: q.id,
            query: q.query,
            queryFetchedAt: q.fetchedAt
        }))
    );
}

main().finally(() => prisma.$disconnect());

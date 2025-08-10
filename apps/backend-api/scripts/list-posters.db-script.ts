import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const rows = await prisma.poster.findMany({
        orderBy: { id: 'asc' },
    });
    // Shape for output
    const posters = rows.map(r => ({
        posterId: r.id,
        posterUrl: r.url,
    }));

    // Pretty console output
    console.log(`Found ${posters.length} posters\n`);
    console.table(
        posters.map(p => ({
            posterUrl: p.posterUrl,
            posterId: p.posterId,
        }))
    );
}

main().finally(() => prisma.$disconnect());

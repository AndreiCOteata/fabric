import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const movies = await prisma.movie.findMany({
        include: { poster: true },
        orderBy: { title: 'asc' },
    });
    console.table(movies.map(m => ({
        title: m.title, year: m.year, type: m.type, poster: m.poster?.url ?? null, updatedAt: m.updatedAt
    })));
}

main().finally(() => prisma.$disconnect());

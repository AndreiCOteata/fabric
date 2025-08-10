import { PrismaClient } from '@prisma/client';
import type { DbPort } from '@acme/lib-db';
import type { MovieDTO } from '@acme/lib-contracts';

export class PrismaDb implements DbPort {
    constructor(private prisma = new PrismaClient()) {}

    async getAllMovies(): Promise<MovieDTO[]> {
        const rows = await this.prisma.movie.findMany({ include: { poster: true }, orderBy: { title: 'asc' } });
        return rows.map(this.toDTO);
    }

    async getMoviesByTitle(title: string): Promise<MovieDTO[]> {
        const rows = await this.prisma.movie.findMany({
            where: { title: { contains: title } },
            include: { poster: true },
            orderBy: { title: 'asc' }
        });
        return rows.map(this.toDTO);
    }

    async getByImdbId(imdbId: string): Promise<MovieDTO | null> {
        const result = await this.prisma.movie.findUnique({ where: { imdbID: imdbId }, include: { poster: true } });
        return result ? this.toDTO(result) : null;
    }

    async upsertMovie(movie:MovieDTO): Promise<void> {
        await this.prisma.movie.upsert({
           where: { imdbID: movie.imdbID },
           create: {
               imdbID: movie.imdbID,
               title: movie.title,
               year: movie.year,
               type: movie.type,
               ...(movie.posterUrl ? {
                   poster: {
                       connectOrCreate: {
                           where: { url: movie.posterUrl },
                           create: { url: movie.posterUrl },
                       },
                   },
               } : {}),
           },
           update: {
               title: movie.title,
               year: movie.year,
               type: movie.type,
               ...(movie.posterUrl ? {
                   poster: {
                       connectOrCreate: {
                           where: { url: movie.posterUrl },
                           create: { url: movie.posterUrl },
                       },
                   },
               } : {}),
           }
        });
    }

    async upsertMovies(movies: MovieDTO[]): Promise<{ inserted: number; updated: number }> {
        let inserted = 0, updated = 0;
        for (const movie of movies) {
            const exists = await this.prisma.movie.findUnique({ where: { imdbID: movie.imdbID }, select: { id: true } });
            await this.upsertMovie(movie);
            exists ? updated++ : inserted++;
        }
        return { inserted, updated };
    }

    private toDTO = (record: any): MovieDTO => ({
        imdbID: record.imdbID,
        title: record.title,
        year: record.year,
        type: record.type,
        posterUrl: record.poster?.url ?? null
    });
}

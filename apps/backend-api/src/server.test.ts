import request from 'supertest';
import { makeApp } from './server';
import { DbPort } from '@acme/lib-db';
import { MovieDTO } from '@acme/lib-contracts';
import { describe, beforeEach, it, vi, expect } from 'vitest';
import type { ImportLogPort } from './db/import-log-port';


const GOOD_URL = 'https://example.com/p1.jpg';
const ID1 = 'tt0000001';
const ID2 = 'tt0000002';

class FakeDb implements DbPort {
    private byImdb = new Map<string, MovieDTO>();
    async getAllMovies(): Promise<MovieDTO[]> {
        return [...this.byImdb.values()];
    }

    async getMoviesByTitle(query: string): Promise<MovieDTO[]> {
        const q = query.toLowerCase();
        return [...this.byImdb.values()].filter(movie => movie.title.toLowerCase().includes(q));
    }

    async getByImdbId(id: string): Promise<MovieDTO | null> {
        return this.byImdb.get(id) ?? null;
    }

    async upsertMovie(movie: MovieDTO): Promise<void> {
        this.byImdb.set(movie.imdbID, movie);
    }

    async upsertMovies(movies: MovieDTO[]): Promise<{ inserted: number; updated: number }> {
        let inserted = 0, updated = 0;
        for(const movie of movies){
            if(this.byImdb.has(movie.imdbID)) {
                updated++;
            } else {
                inserted++;
            }
            this.byImdb.set(movie.imdbID, movie);
        }
        return { inserted, updated };
    }
}

class FakeImportLogRepo implements ImportLogPort {
    private map = new Map<string, Date>();

    async get(query: string) {
        const fetchedAt = this.map.get(query);
        return fetchedAt ? { query, fetchedAt } : null;
    }

    async markImported(query: string) {
        this.map.set(query, new Date());
    }
}

function makeMoviesResponse(items: Partial<MovieDTO>[]): { items: MovieDTO[] }{
    return {
        items: items.map((it) => ({
            imdbID: it.imdbID ?? 'id',
            title: it.title ?? 'Title',
            year: it.year ?? '1999',
            type: it.type ?? 'movie',
            posterUrl: it.posterUrl ?? null,
        })),
    };
}

describe('backend-api server', () => {
    const REFRESH_1H = 60 * 60 * 1000;

    beforeEach(() => {
        vi.restoreAllMocks();
        process.env.OMDB_BACKEND_URL = 'http://fake-omdb-backend';
    });

    it('cache miss -> calls omdb-backend, saves, returns items', async () => {
        const db = new FakeDb();
        const importLog = new FakeImportLogRepo();

        // mock fetch to omdb-backend
        const fetchMock = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () =>
                makeMoviesResponse([
                    { imdbID: 'tt0133093', title: 'The Matrix', year: '1999', type: 'movie', posterUrl: GOOD_URL },
                    { imdbID: 'tt0234215', title: 'The Matrix Reloaded', year: '2003', type: 'movie', posterUrl: null },
                ]),
        } as any);

        const app = makeApp(db, importLog, REFRESH_1H);

        const res = await request(app).get('/movies').query({ q: 'Matrix' }).expect(200);
        expect(res.body.items).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // second call: should be served from DB (no extra fetch)
        const res2 = await request(app).get('/movies').query({ q: 'Matrix' }).expect(200);
        expect(res2.body.items).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('/fetch/:which uses the fixed title map and returns JSON', async () => {
        const db = new FakeDb();
        const importLog = new FakeImportLogRepo();

        vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () =>
                makeMoviesResponse([{ imdbID: 'tt0242653', title: 'The Matrix Revolutions', year: '2003', type: 'movie' }]),
        } as any);

        const app = makeApp(db, importLog, REFRESH_1H);

        const res = await request(app).get('/fetch/matrix-revolutions').expect(200);
        expect(res.body.items[0].title).toBe('The Matrix Revolutions');
    });

    it('stale import (> refreshTime) triggers a re-fetch', async () => {
        const db = new FakeDb();
        const importLog = new FakeImportLogRepo();
        const app = makeApp(db, importLog, 5); // 5ms for test

        // first fetch returns 1 item
        const fetchMock = vi.spyOn(global, 'fetch' as any)
            .mockResolvedValueOnce({
                ok: true,
                json: async () =>
                    makeMoviesResponse([
                        { imdbID: ID1, title: 'The Matrix (old)', posterUrl: GOOD_URL },
                    ]),
            } as any)
            // second fetch (after staleness) returns 2 items
            .mockResolvedValueOnce({
                ok: true,
                json: async () =>
                    makeMoviesResponse([
                        { imdbID: ID1, title: 'The Matrix (old)', posterUrl: GOOD_URL },
                        { imdbID: ID2, title: 'The Matrix (new)', posterUrl: GOOD_URL },
                    ]),
            } as any);

        const r1 = await request(app).get('/movies').query({ q: 'Matrix' }).expect(200);
        expect(r1.body.items).toHaveLength(1);

        await new Promise((r) => setTimeout(r, 20));

        const r2 = await request(app).get('/movies').query({ q: 'Matrix' }).expect(200);
        expect(r2.body.items).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('propagates upstream errors as 502', async () => {
        const db = new FakeDb();
        const importLog = new FakeImportLogRepo();

        vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ error: 'bad key' }),
        } as any);

        const app = makeApp(db, importLog, REFRESH_1H);
        const res = await request(app).get('/movies').query({ q: 'Matrix' }).expect(502);
        expect(String(res.body.error)).toContain('Upstream 401');
    });

    it('400 on missing q for /movies', async () => {
        const db = new FakeDb();
        const importLog = new FakeImportLogRepo();
        const app = makeApp(db, importLog, REFRESH_1H);

        const res = await request(app).get('/movies').expect(400);
        expect(res.body.error).toMatch(/Missing/);
    });
});

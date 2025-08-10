import request from 'supertest';
import { describe, beforeEach, it, vi, expect } from 'vitest';
import { Express } from 'express';
import { makeApp } from './server';

function mkOmdbSearch(overrides: Partial<any> = {}) {
    return {
        Search: [
            { Title: 'The Matrix', Year: '1999', imdbID: 'tt0133093', Type: 'movie', Poster: 'https://x/y.jpg' },
            { Title: 'The Matrix Reloaded', Year: '2003', imdbID: 'tt0234215', Type: 'movie', Poster: 'N/A' },
        ],
        totalResults: '153',
        Response: 'True',
        ...overrides,
    };
}

describe('omdb-backend-api', () => {
   let app: Express;
   beforeEach(async () => {
      vi.restoreAllMocks();
       app = makeApp({ omdbApiKey: 'dummy' });
   });

   it('GET /movies normalizes OMDb payload', async () => {
       vi.spyOn(global, 'fetch' as any).mockResolvedValue({
           ok: true,
           json: async () => mkOmdbSearch(),
       } as any);

       const response = await request(app).get('/movies').expect(200);

       expect(response.body).toEqual({
           items: [
               {
                   imdbID: 'tt0133093',
                   title: 'The Matrix',
                   year: '1999',
                   type: 'movie',
                   posterUrl: 'https://x/y.jpg',
               },
               {
                   imdbID: 'tt0234215',
                   title: 'The Matrix Reloaded',
                   year: '2003',
                   type: 'movie',
                   posterUrl: null,
               },
           ]
       })
   });

    it('GET /movies-reloaded hits OMDb and returns items array', async () => {
        const spy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () => mkOmdbSearch(),
        } as any);

        const response = await request(app).get('/movies-reloaded').expect(200);
        expect(Array.isArray(response.body.items)).toBe(true);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('GET /movies-revolutions propagates upstream HTTP failure as 502', async () => {
        const spy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ Error: 'Invalid API key', Response: 'False'}),
        } as any);

        const response = await request(app).get('/movies-revolutions').expect(502);
        expect(response.body.error).toContain('UPSTREAM_401');
    });

    it('GET /movies returns 502 on bad upstream shape', async () => {
        vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () => ({ foo: 'bar', Response: 'True' }),
        } as any);

        const response = await request(app).get('/movies').expect(502);
        expect(response.body.error).toBe('BAD_UPSTREAM_SHAPE');
    });

    it('GET /movies returns empty list when OMDb returns Response False', async () => {
        vi.spyOn(global, 'fetch' as any).mockResolvedValue({
            ok: true,
            json: async () => ({ Response: 'False', Error: 'Movie not found!' }),
        } as any);

        const response = await request(app).get('/movies').expect(200);
        expect(response.body).toEqual({ items: [] });
    });
});

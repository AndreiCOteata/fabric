import express from 'express';
import type { DbPort } from '@acme/lib-db';
import { MoviesResponse } from '@acme/lib-contracts';
import type { ImportLogPort } from './db/import-log-port';

async function getMoviesForQuery(db: DbPort, importLog: ImportLogPort, queryParam: string, refreshTime: number) {
    const log = await importLog.get(queryParam);
    const needsRefresh = !log || Date.now() - new Date(log.fetchedAt).getTime() >= refreshTime;

    let movies = await db.getMoviesByTitle(queryParam);

    if (needsRefresh) {
        const endpoint = queryParam === 'Matrix' ? 'movies' : queryParam === 'Matrix Reloaded' ? 'movies-reloaded' : 'movies-revolutions';
        const omdbResponse = await fetch(`${process.env.OMDB_BACKEND_URL}/${endpoint}`);

        if (!omdbResponse.ok) {
            throw new Error(`Upstream ${omdbResponse.status}`);
        }
        const json = await omdbResponse.json();
        const parsed = MoviesResponse.safeParse(json);
        if (!parsed.success) {
            throw new Error('Bad data from omdb-backend');
        }

        await db.upsertMovies(parsed.data.items);

        await importLog.markImported(queryParam);
        movies = await db.getMoviesByTitle(queryParam);
    }
    return { items: movies, refreshed: needsRefresh };
}

function catchError(response: any, error: any) {
    const msg = String(error?.message ?? error);
    if (msg.startsWith('Upstream') || msg.includes('Bad data from omdb-backend')) {
        return response.status(502).json({ error: msg });
    }
    response.status(500).json({ error: msg || 'Internal error' });
}
export function makeApp(db: DbPort, importLog: ImportLogPort, refreshTime: number) {
    const app = express();

    app.set('etag', false);
    app.use((_, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next();
    });

    const titleMap: Record<string, string> = {
        'matrix': 'Matrix',
        'matrix-reloaded': 'Matrix Reloaded',
        'matrix-revolutions': 'Matrix Revolutions',
    };

    app.get('/movies', async (request, response) => {
        const queryParam = String(request.query.q || '').trim();
        if (!queryParam) {
            return response.status(400).json({ error: 'Missing queryParam' });
        }

        try {
            const payload = await getMoviesForQuery(db, importLog, queryParam, refreshTime);
            response.json(payload);
        } catch (error: any) {
            catchError(response, error);
        }
    });

    app.get('/fetch/:which', async (request, response) => {
        const queryParam = titleMap[request.params.which];
        if (!queryParam) {
            return response.status(404).json({ error: 'Unknown dataset' });
        }
        try {
            const payload = await getMoviesForQuery(db, importLog, queryParam, refreshTime);
            response.json(payload);
        } catch (error: any) {
            catchError(response, error);
        }
    });

    return app;
}

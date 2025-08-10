import express from 'express';
import { MoviesResponse, MovieDTO } from '@acme/lib-contracts';

export function makeApp({ omdbApiKey }: { omdbApiKey: string }) {
    const app = express();

    app.set('etag', false);
    app.use((_, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        next();
    });

    const urls = {
        matrix: `https://www.omdbapi.com/?s=${encodeURIComponent('Matrix')}&apikey=${omdbApiKey}`,
        reloaded: `https://www.omdbapi.com/?s=${encodeURIComponent('Matrix Reloaded')}&apikey=${omdbApiKey}`,
        revolutions: `https://www.omdbapi.com/?s=${encodeURIComponent('Matrix Revolutions')}&apikey=${omdbApiKey}`,
    };

    async function fetchAndNormalize(url: string) {
        const response = await fetch(url);
        console.log(`Response is ${response}`);
        if (!response.ok) {
            throw new Error('UPSTREAM_' + response.status);
        }
        const data = await response.json();

        const isTrue = String(data?.Response ?? 'True') === 'True';
        if (isTrue && !Array.isArray(data?.Search)) {
            throw new Error('BAD_UPSTREAM_SHAPE');
        }
        const items: MovieDTO[] = (data?.Search ?? []).map((m: any) => ({
            imdbID: m.imdbID,
            title: m.Title,
            year: m.Year,
            type: m.Type,
            posterUrl: m.Poster && m.Poster !== 'N/A' ? m.Poster : null,
        }));
        const parsed = MoviesResponse.safeParse({ items });
        if (!parsed.success) {
            throw new Error('BAD_UPSTREAM_SHAPE');
        }
        return parsed.data;
    }

    app.get('/movies', async (_request, response) => {
        try {
            response.json(await fetchAndNormalize(urls.matrix));
        }
        catch (error: any) {
            response.status(502).json({ error: error.message || 'Upstream error' });
        }
    });

    app.get('/movies-reloaded', async (_request, response) => {
        try { response.json(await fetchAndNormalize(urls.reloaded)); }
        catch (error: any) {
            response.status(502).json({ error: error.message || 'Upstream error' });
        }
    });

    app.get('/movies-revolutions', async (_request, response) => {
        try { response.json(await fetchAndNormalize(urls.revolutions)); }
        catch (error: any) {
            response.status(502).json({ error: error.message || 'Upstream error' });
        }
    });

    return app;
}

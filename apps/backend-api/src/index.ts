import 'dotenv/config';
import { makeApp } from './server';
import { PrismaDb } from './db/prisma-db';
import { ImportLogRepo } from './db/import-log-repo';
import {PrismaClient} from "@prisma/client";

if (!process.env.OMDB_BACKEND_URL) {
    throw new Error('OMDB_BACKEND_URL is required');
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
}

let refreshTimeEnv = process.env.REFRESH_TIME_MS;
if (!refreshTimeEnv) {
    console.error('Missing REFRESH_TIME_MS from env. Defaulting to 1 hour');
    refreshTimeEnv = '3600000';
}

const prisma = new PrismaClient();
const db = new PrismaDb(prisma);
const importLogRepo = new ImportLogRepo(prisma);

const refreshTime = Number(refreshTimeEnv);
const port = Number(process.env.PORT || 4000);

const app = makeApp(db, importLogRepo, refreshTime);

app.set('etag', false);
app.use((_, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

app.listen(port, () => {
    console.log(`[backend-api] listening on http://localhost:${port}`);
});

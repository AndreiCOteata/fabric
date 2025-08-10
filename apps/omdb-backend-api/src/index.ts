import 'dotenv/config';
import { makeApp } from './server';

const omdbApiKey = process.env.OMDB_API_KEY;
if (!omdbApiKey) {
    throw new Error('Missing OMDB_API_KEY');
}
const app = makeApp({ omdbApiKey });
const port = Number(process.env.PORT || 4001);

app.listen(port, () => {
    console.log(`[omdb-backend-api] listening on http://localhost:${port}`);
});


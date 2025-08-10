import { useState } from 'react';
import type { MovieDTO as Movie } from '@acme/lib-contracts';

async function fetchSet(which: 'matrix' | 'matrix-reloaded' | 'matrix-revolutions') {
    const response = await fetch(`/api/fetch/${which}`);
    console.log(`Response is ${response}`);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as { items: Movie[] };
}

export default function App() {
    const [items, setItems] = useState<Movie[]>([]);
    const [status, setStatus] = useState('');

    const go = async (which: 'matrix' | 'matrix-reloaded' | 'matrix-revolutions') => {
        setStatus('Loading...');
        try {
            const data = await fetchSet(which);
            setItems(data.items ?? []);
            setStatus(`Loaded ${data.items.length} movies`);
        } catch (error: any) {
            setStatus(error?.message ?? 'Error');
        }
    };

    return (
        <div>
            <h1>Matrix Movies</h1>

            <div className='button-group'>
                <button onClick={() => go('matrix')}>Matrix</button>
                <button onClick={() => go('matrix-reloaded')}>Matrix Reloaded</button>
                <button onClick={() => go('matrix-revolutions')}>Matrix Revolutions</button>
            </div>

            <p>{status}</p>

            {items.map((movie) => (
                <div role='article' key={movie.imdbID} className='card'>
                    {movie.posterUrl && <img src={movie.posterUrl} alt={movie.title} />}
                    <div className='card-info'>
                        <strong>{movie.title}</strong>
                        <span>{movie.year} · {movie.type}</span>
                        <small>{movie.imdbID}</small>
                    </div>
                </div>
            ))}
        </div>
    );
}

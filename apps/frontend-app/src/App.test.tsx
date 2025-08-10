import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { test, expect } from 'vitest';
import App from './App';
import {delay, http, HttpResponse} from 'msw';
import { server } from './test/testServer.ts';

test('clicking Matrix loads one result', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /matrix$/i }));
    expect(await screen.findByText(/loaded 1 movies/i)).toBeInTheDocument();
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
});

test('shows HTTP error if backend fails', async () => {
    server.use(
        http.get('/api/fetch/matrix', () => HttpResponse.text('fail', { status: 500 }))
    );

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^matrix$/i }));

    expect(await screen.findByText(/500/i)).toBeInTheDocument();
});

test('renders "No Poster" when posterUrl is null', async () => {
    server.use(
        http.get('/api/fetch/matrix', () =>
            HttpResponse.json({
                items: [
                    { imdbID: 'tt0133093', title: 'The Matrix', year: '1999', type: 'movie', posterUrl: null },
                ],
            })
        )
    );

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^matrix$/i }));

    expect(await screen.findByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText(/no poster/i)).toBeInTheDocument();
});

test('clicking buttons switches results', async () => {
    server.use(
        http.get('/api/fetch/matrix', () =>
            HttpResponse.json({ items: [{ imdbID:'tt0133093', title:'The Matrix', year:'1999', type:'movie', posterUrl:null }]})
        ),
        http.get('/api/fetch/matrix-reloaded', () =>
            HttpResponse.json({ items: [{ imdbID:'tt0234215', title:'The Matrix Reloaded', year:'2003', type:'movie', posterUrl:null }]})
        )
    );

    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /^matrix$/i }));
    expect(await screen.findByText('The Matrix')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /matrix reloaded/i }));
    expect(await screen.findByText('The Matrix Reloaded')).toBeInTheDocument();
    expect(screen.queryByText('The Matrix')).not.toBeInTheDocument();
});

test('Shows Loading... during slow API', async () => {
    server.use(
        http.get('/api/fetch/matrix', async () => {
            await delay(200);
            return HttpResponse.json({ items: [] });
        })
    );

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^matrix$/i }));

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    expect(await screen.findByText(/loaded 0 movies/i)).toBeInTheDocument();
});

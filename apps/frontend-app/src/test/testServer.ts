import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
    http.get('/api/fetch/:which', ({ params }) => {
        const which = params.which as string;
        if (which === 'matrix') {
            return HttpResponse.json({ items: [{ imdbID:'tt0133093', title:'The Matrix', year:'1999', type:'movie', posterUrl:null }]});
        }
        if (which === 'matrix-reloaded') {
            return HttpResponse.json({ items: [{ imdbID:'tt0234215', title:'The Matrix Reloaded', year:'2003', type:'movie', posterUrl:null }]});
        }
        if (which === 'matrix-revolutions') {
            return HttpResponse.json({ items: [{ imdbID:'tt0242653', title:'The Matrix Revolutions', year:'2003', type:'movie', posterUrl:null }]});
        }
        return HttpResponse.json({ items: [] });
    }),
);

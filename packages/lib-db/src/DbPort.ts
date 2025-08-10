import type { MovieDTO } from '@acme/lib-contracts';

export interface DbPort {
    getAllMovies(): Promise<MovieDTO[]>;
    getMoviesByTitle(q: string): Promise<MovieDTO[]>;
    getByImdbId(id: string): Promise<MovieDTO | null>;
    upsertMovie(movie: MovieDTO): Promise<void>;
    upsertMovies(movies: MovieDTO[]): Promise<{ inserted: number; updated: number }>;
}

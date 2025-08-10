import { z } from 'zod';

export const MovieDTO = z.object({
    imdbID: z.string(),
    title: z.string(),
    year: z.string(),
    type: z.string(),
    posterUrl: z.string().url().nullable()
});
export type MovieDTO = z.infer<typeof MovieDTO>;

export const MoviesResponse = z.object({
    items: z.array(MovieDTO)
});
export type MoviesResponse = z.infer<typeof MoviesResponse>;

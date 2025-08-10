export interface ImportLogPort {
    get(query: string): Promise<{ query: string; fetchedAt: Date } | null>;
    markImported(query: string): Promise<void>;
}

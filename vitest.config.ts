import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'backend',
        globals: true,
        environment: 'node',
        include: [
            'apps/backend-api/src/**/*.test.ts',
            'apps/omdb-backend-api/src/**/*.test.ts',
            'packages/**/src/**/*.test.ts',
        ],
    },
});

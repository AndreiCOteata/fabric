import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './src/test/setupTests.ts',
        css: true,
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
});

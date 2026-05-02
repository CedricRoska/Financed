import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['__tests__/**/*.test.ts', 'lib/**/*.test.ts', 'app/**/*.test.ts'],
    exclude: ['node_modules', '.next', '_bmad', '_bmad-output', '.claude'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})

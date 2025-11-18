import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.{test,test-d}.ts'],
    coverage: {
      enabled: true,
      provider: 'istanbul',
    },
  },
})

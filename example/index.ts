import { createJiti } from 'jiti'
import { consola } from 'consola'
import { example } from './utils'

const jiti = createJiti(import.meta.url)
const silent = process.argv.includes('--silent')

async function main() {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const files = await fs.readdir(new URL('scripts', import.meta.url))
  await files.toSorted().reduce(async (promise, file) => {
    await promise

    if (!file.endsWith('.ts')) return

    const filepath = path.join(import.meta.dirname, 'scripts', file)
    const func = await jiti.import<ReturnType<typeof example>>(filepath, { default: true })
    await func({
      log(message, ...args: any[]) {
        if (silent) return
        consola.withTag(file).info(message, ...args)
      },
    })
  }, Promise.resolve())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

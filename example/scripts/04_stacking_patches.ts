import { example } from '../utils'

export default example(async (untouchable, { log }) => {
  const logger = {
    log: (message: string) => log(message),
  }

  const revoke1 = untouchable(logger, 'log', (original, message) => {
    const timestamp = new Date().toISOString()
    return original(`[${timestamp}] ${message}`)
  }, { replace: true })

  const revoke2 = untouchable(logger, 'log', (original, message) => {
    return original(`[INFO] ${message}`)
  }, { replace: true })

  logger.log('Hello') // [2025-11-18T12:34:56.789Z] [INFO] Hello

  revoke2() // remove log level
  logger.log('Hello') // [2025-11-18T12:34:56.789Z] Hello

  revoke1() // remove timestamp
  logger.log('Hello') // Hello
})

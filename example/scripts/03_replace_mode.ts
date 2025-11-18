import { example } from '../utils'

const cache = new Map()

const utils = {
  async executeHeavyComputation(input: number) {
    // Simulate heavy computation
    return input * 2
  },
}

export default example(async (untouchable, { log }) => {
  const revoke = untouchable(utils, 'executeHeavyComputation', async (original, input) => {
    if (cache.has(input)) {
      log('Returning cached result for input:', input)
      return cache.get(input)
    }
    const result = await original(input)
    cache.set(input, result)
    log('Computed and cached result for input:', input)
    return result
  }, { replace: true })

  await utils.executeHeavyComputation(5) // computes and caches result
  await utils.executeHeavyComputation(5) // returns cached result

  revoke() // restore original function

  await utils.executeHeavyComputation(5) // computes again
})

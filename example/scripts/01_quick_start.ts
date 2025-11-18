import { example } from '../utils'

export default example(async (untouchable, { log }) => {
  const revoke = untouchable(globalThis, 'fetch', (input, init) => {
    log(`Fetching: ${input.toString()} with options:`, init)
  })

  try {
    await fetch('https://api.example.com/data', {
      method: 'GET',
    }) // This will be logged by the untouchable patch
  }
  catch {
    // Ignore network errors in example
  }

  revoke() // restore original function

  try {
    await fetch('https://api.example.com/other-data', {
      method: 'GET',
    }) // This will NOT be logged
  }
  catch {
    // Ignore network errors in example
  }
})

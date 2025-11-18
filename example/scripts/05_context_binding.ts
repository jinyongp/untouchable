import { example } from '../utils'

export default example(async (untouchable, { log }) => {
  const counter = {
    count: 0,
    increment() {
      return ++this.count
    },
  }

  const customContext = { count: 100 }

  untouchable(counter, 'increment', function (original) {
    // this refers to customContext
    return original()
  }, { replace: true, bind: customContext })

  log(counter.increment()) // Returns: 101 (uses customContext.count)
})

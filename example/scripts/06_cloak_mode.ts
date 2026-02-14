import { example } from '../utils'
import { isProxy } from 'node:util/types'

export default example(async (untouchable, { log }) => {
  const defaultTarget = {
    fn() {
      return 'ok'
    },
  }

  const cloakTarget = {
    fn() {
      return 'ok'
    },
  }

  const originalPrototypeToString = Function.prototype.toString

  try {
    Function.prototype.toString = function () {
      return 'before'
    }

    untouchable(defaultTarget, 'fn', () => { })
    untouchable(cloakTarget, 'fn', () => { }, { cloak: true })

    log('default toString:', defaultTarget.fn.toString())
    log('cloak toString:', cloakTarget.fn.toString())
    log('default toString isProxy:', isProxy(defaultTarget.fn.toString))
    log('cloak toString isProxy:', isProxy(cloakTarget.fn.toString))
  }
  finally {
    Function.prototype.toString = originalPrototypeToString
  }
})

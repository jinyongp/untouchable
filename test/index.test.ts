/** @see https://www.npmjs.com/package/is-proxy */
import 'is-proxy'
import { isProxy as isProxy1 } from 'is-proxy'

/** @see https://nodejs.org/api/util.html#utiltypesisproxyvalue */
import { isProxy as isProxy2 } from 'node:util/types'

import { untouchable } from '../src'

describe('untouchable core functionality', () => {
  let mock: ReturnType<typeof vi.fn<(a: number, b: number) => number>>
  let target: { func: typeof mock }
  let handler: ReturnType<typeof vi.fn<(a: number, b: number) => void>>

  beforeEach(() => {
    mock = vi.fn((a: number, b: number) => a + b)
    target = { func: mock }
    handler = vi.fn()
    untouchable(target, 'func', handler)
  })

  test('handler is called when the patched function is invoked', () => {
    target.func(1, 2)
    expect(handler).toHaveBeenCalledOnce()
  })

  test('handler receives the correct arguments', () => {
    target.func(1, 2)
    expect(handler).toHaveBeenCalledWith(1, 2)
  })

  test('original function result is returned', () => {
    const result = target.func(1, 2)
    expect(result).toBe(3)
    expect(handler).toHaveBeenCalledWith(1, 2)
  })

  test('original function context (this) is preserved', () => {
    const target = {
      multiplier: 3,
      func(a: number, b: number) {
        return (a + b) * this.multiplier
      },
    }
    const localHandler = vi.fn()
    untouchable(target, 'func', localHandler)

    expect(target.func(1, 2)).toBe(9)
    expect(localHandler).toHaveBeenCalledWith(1, 2)
  })

  test('handler can access target properties via this', () => {
    const targetWithId = { id: 'test-123', func: vi.fn((x: number) => x * 2) }
    const handlerWithAccess = vi.fn(function (this: typeof targetWithId, _x) {
      expect(this.id).toBe('test-123')
    })

    untouchable(targetWithId, 'func', handlerWithAccess)
    const result = targetWithId.func(5)

    expect(handlerWithAccess).toHaveBeenCalledWith(5)
    expect(result).toBe(10)
  })

  test('handler throwing error does not prevent original execution', () => {
    const obj = { fn: vi.fn(() => 'result') }
    const throwingHandler = vi.fn(() => {
      throw new Error('handler error')
    })

    untouchable(obj, 'fn', throwingHandler)

    expect(() => obj.fn()).toThrow('handler error')
    expect(throwingHandler).toHaveBeenCalledOnce()
    expect(obj.fn).not.toHaveBeenCalled()
  })

  test('works with functions that have no parameters', () => {
    const obj = { fn: vi.fn(() => 42) }
    const handler = vi.fn()

    untouchable(obj, 'fn', handler)

    expect(obj.fn()).toBe(42)
    expect(handler).toHaveBeenCalledWith()
  })

  test('works with functions that have rest parameters', () => {
    const obj = { fn: vi.fn((...args: number[]) => args.reduce((a, b) => a + b, 0)) }
    const handler = vi.fn()

    untouchable(obj, 'fn', handler)

    expect(obj.fn(1, 2, 3, 4, 5)).toBe(15)
    expect(handler).toHaveBeenCalledWith(1, 2, 3, 4, 5)
  })
})

describe('untouchable revoke functionality', () => {
  test('revoke restores original function', () => {
    const obj = { fn: vi.fn(() => 'original') }
    const handler = vi.fn()

    const revoke = untouchable(obj, 'fn', handler)

    expect(obj.fn()).toBe('original')
    expect(handler).toHaveBeenCalledOnce()

    revoke()

    handler.mockClear()
    expect(obj.fn()).toBe('original')
    expect(handler).not.toHaveBeenCalled()
  })

  test('multiple revoke calls are safe', () => {
    const obj = { fn: () => 'result' }
    const revoke = untouchable(obj, 'fn', () => { })

    expect(() => {
      revoke()
      revoke()
      revoke()
    }).not.toThrow()
  })

  test('multiple patches stack - revoke restores previous patch', () => {
    const obj = { fn: () => 'original' }
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const handler3 = vi.fn()

    const revoke1 = untouchable(obj, 'fn', handler1)
    const revoke2 = untouchable(obj, 'fn', handler2)
    const revoke3 = untouchable(obj, 'fn', handler3)

    // All handlers execute in reverse order (3 → 2 → 1 → original)
    obj.fn()
    expect(handler3).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
    expect(handler1).toHaveBeenCalledOnce()

    // Revoke last patch - goes back to handler2 + handler1 chain
    revoke3()
    handler1.mockClear()
    handler2.mockClear()
    handler3.mockClear()

    obj.fn()
    expect(handler2).toHaveBeenCalledOnce()
    expect(handler1).toHaveBeenCalledOnce()
    expect(handler3).not.toHaveBeenCalled()

    // Revoke handler2 - goes back to handler1 only
    revoke2()
    handler1.mockClear()
    handler2.mockClear()

    obj.fn()
    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).not.toHaveBeenCalled()

    // Revoke handler1 - goes back to original
    revoke1()
    handler1.mockClear()

    expect(obj.fn()).toBe('original')
    expect(handler1).not.toHaveBeenCalled()
  })

  test('revoke restores to previous state - handlers chain together', () => {
    const obj = { fn: () => 'original' }
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    const revoke1 = untouchable(obj, 'fn', handler1)
    untouchable(obj, 'fn', handler2)

    // Both handlers execute in chain
    obj.fn()
    expect(handler2).toHaveBeenCalledOnce()
    expect(handler1).toHaveBeenCalledOnce()

    // Revoke handler1 - this restores obj.fn to original
    // handler2's proxy is now orphaned (not reachable from obj.fn)
    revoke1()
    handler1.mockClear()
    handler2.mockClear()

    // Now obj.fn is back to original, handler2 is not called
    expect(obj.fn()).toBe('original')
    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })
})

describe('untouchable with replace option', () => {
  test('can replace function return value', () => {
    const obj = { add: (a: number, b: number) => a + b }

    untouchable(obj, 'add', (original, a, b) => {
      return original(a, b) * 2
    }, { replace: true })

    expect(obj.add(2, 3)).toBe(10) // (2+3)*2
  })

  test('can completely override function behavior', () => {
    const obj = { multiply: (a: number, b: number) => a * b }

    untouchable(obj, 'multiply', (_original, a, b) => {
      return a + b // ignore original
    }, { replace: true })

    expect(obj.multiply(2, 3)).toBe(5) // 2+3 instead of 2*3
  })

  test('original function can be called inside replaced handler', () => {
    const obj = { compute: (n: number) => n + 1 }
    const handler = vi.fn((original, n) => {
      const result = original(n)
      return result * 2
    })

    untouchable(obj, 'compute', handler, { replace: true })

    expect(obj.compute(5)).toBe(12) // (5+1)*2
    expect(handler).toHaveBeenCalledWith(expect.any(Function), 5)
  })

  test('original function preserves this context', () => {
    const obj = {
      multiplier: 3,
      compute(n: number) {
        return n * this.multiplier
      },
    }

    untouchable(obj, 'compute', function (original, n) {
      expect(this).toBe(obj)
      return original(n) * 2
    }, { replace: true })

    expect(obj.compute(5)).toBe(30) // (5*3)*2
  })

  test('does not cause infinite recursion when calling original', () => {
    const obj = { factorial: (n: number): number => n <= 1 ? 1 : n * obj.factorial(n - 1) }

    untouchable(obj, 'factorial', (original, n) => {
      return original(n)
    }, { replace: true })

    expect(() => obj.factorial(5)).not.toThrow()
    expect(obj.factorial(5)).toBe(120)
  })

  test('replacer throwing error prevents original execution', () => {
    const obj = { fn: vi.fn(() => 'result') }
    const replacer = vi.fn(() => {
      throw new Error('replacer error')
    })

    untouchable(obj, 'fn', replacer, { replace: true })

    expect(() => obj.fn()).toThrow('replacer error')
    expect(obj.fn).not.toHaveBeenCalled()
  })

  test('replacer can modify arguments before calling original', () => {
    const obj = { add: (a: number, b: number) => a + b }

    untouchable(obj, 'add', (original, a, b) => {
      return original(a * 2, b * 2) // double arguments
    }, { replace: true })

    expect(obj.add(2, 3)).toBe(10) // (2*2)+(3*2)
  })

  test('replacer can conditionally call original', () => {
    const obj = { getValue: (n: number) => n }

    untouchable(obj, 'getValue', (original, n) => {
      if (n < 0) return 0 // don't call original for negative
      return original(n)
    }, { replace: true })

    expect(obj.getValue(-5)).toBe(0)
    expect(obj.getValue(5)).toBe(5)
  })

  test('multiple replace patches stack correctly', () => {
    const obj = { value: (n: number) => n }

    const revoke1 = untouchable(obj, 'value', (original, n) => {
      return original(n) * 2
    }, { replace: true })

    expect(obj.value(5)).toBe(10) // 5*2

    const revoke2 = untouchable(obj, 'value', (original, n) => {
      return original(n) + 1
    }, { replace: true })

    // Second patch receives first patch as original
    // So it's (5*2)+1=11
    expect(obj.value(5)).toBe(11)

    // Revoke second patch - back to first patch
    revoke2()
    expect(obj.value(5)).toBe(10) // 5*2

    revoke1() // no effect
    expect(obj.value(5)).toBe(5)
  })

  test('works with async functions', async () => {
    const obj = {
      asyncAdd: async (a: number, b: number) => Promise.resolve(a + b),
    }

    untouchable(obj, 'asyncAdd', async (original, a, b) => {
      const result = await original(a, b)
      return result * 2
    }, { replace: true })

    await expect(obj.asyncAdd(2, 3)).resolves.toBe(10)
  })

  test('works with async replacer that throws', async () => {
    const obj = {
      asyncFn: async () => 'success',
    }

    untouchable(obj, 'asyncFn', async () => {
      throw new Error('async error')
    }, { replace: true })

    await expect(obj.asyncFn()).rejects.toThrow('async error')
  })

  test('works with Promise-returning functions', async () => {
    const obj = {
      fetchData: (id: number) => Promise.resolve(`data-${id}`),
    }

    untouchable(obj, 'fetchData', async (original, id) => {
      const data = await original(id)
      return data.toUpperCase()
    }, { replace: true })

    await expect(obj.fetchData(123)).resolves.toBe('DATA-123')
  })
})

describe('untouchable with bind option', () => {
  test('binds handler to specified context', () => {
    const obj = { multiply: (a: number, b: number) => a * b }
    const customContext = { factor: 10 }

    const handler = vi.fn(function (this: typeof customContext, _a, _b) {
      expect(this).toBe(customContext)
      expect(this.factor).toBe(10)
    })

    untouchable(obj, 'multiply', handler, { bind: customContext })

    obj.multiply(2, 3)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(2, 3)
  })

  test('bind works with replace mode', () => {
    const obj = { compute: (n: number) => n * 2 }
    const customContext = { multiplier: 3 }

    const handler = vi.fn(function (this: typeof customContext, original, n) {
      expect(this).toBe(customContext)
      return original(n) * this.multiplier
    })

    untouchable(obj, 'compute', handler, { replace: true, bind: customContext })

    expect(obj.compute(5)).toBe(30) // (5*2)*3
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(expect.any(Function), 5)
  })

  test('preserves toString with bind', () => {
    const obj = { fn: (x: number) => x + 1 }
    const customContext = {}
    const originalToString = obj.fn.toString()

    untouchable(obj, 'fn', function () { }, { bind: customContext })

    expect(obj.fn.toString()).toBe(originalToString)
    expect(obj.fn.toString()).not.toContain('bound')
  })

  test('preserves toString chain with bind', () => {
    const obj = { fn: (x: number) => x * 2 }
    const customContext = {}

    const originalToString = obj.fn.toString()
    const originalToStringToString = obj.fn.toString.toString()

    untouchable(obj, 'fn', function () { }, { bind: customContext })

    expect(obj.fn.toString()).toBe(originalToString)
    expect(obj.fn.toString.toString()).toBe(originalToStringToString)
    expect(obj.fn.toString.name).toBe('toString')
    expect(obj.fn.toString.toString.toString).toBeDefined()
  })

  test('bind affects original function context in replace mode', () => {
    const obj = {
      value: 100,
      getValue: function () { return this.value },
    }
    const customContext = { value: 200 }

    untouchable(obj, 'getValue', function (original) {
      return original()
    }, { replace: true, bind: customContext })

    expect(obj.getValue()).toBe(200) // customContext.value, not obj.value
  })

  test('bind changes function this context', () => {
    const obj = {
      multiplier: 5,
      compute: function (n: number) { return n * this.multiplier },
    }
    const customContext = { multiplier: 10 }

    untouchable(obj, 'compute', function (original, n) {
      return original(n)
    }, { replace: true, bind: customContext })

    expect(obj.compute(3)).toBe(30) // 3 * 10 (customContext.multiplier)
  })

  test('multiple patches with different bind contexts', () => {
    const obj = { fn: (x: number) => x }
    const context1 = { id: 'first' }
    const context2 = { id: 'second' }

    const handler1 = vi.fn(function (this: typeof context1) {
      expect(this.id).toBe('first')
    })

    untouchable(obj, 'fn', handler1, { bind: context1 })

    const handler2 = vi.fn(function (this: typeof context2) {
      expect(this.id).toBe('second')
    })

    untouchable(obj, 'fn', handler2, { bind: context2 })

    obj.fn(5)

    // Both handlers execute with their respective contexts
    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
    expect(handler1).toHaveBeenCalledWith(5)
    expect(handler2).toHaveBeenCalledWith(5)
  })

  test('bind with different this contexts works correctly', () => {
    const obj = { fn: (x: number) => x }
    const contexts: any[] = []
    const bindContext = { id: 'custom' }

    untouchable(obj, 'fn', function (this: any) {
      contexts.push(this)
    }, { bind: bindContext })

    obj.fn(1)
    obj.fn(2)

    expect(contexts).toHaveLength(2)
    expect(contexts[0]).toBe(bindContext)
    expect(contexts[1]).toBe(bindContext)
  })

  test('revoke after bind restores original', () => {
    const obj = {
      value: 10,
      getValue: function () { return this.value },
    }
    const customContext = { value: 20 }

    const revoke = untouchable(obj, 'getValue', function (original) {
      return original()
    }, { replace: true, bind: customContext })

    expect(obj.getValue()).toBe(20)

    revoke()
    expect(obj.getValue()).toBe(10) // back to original this context
  })
})

describe('untouchable is undetectable', () => {
  let mock: ReturnType<typeof vi.fn<(a: number, b: number) => number>>
  let target: { func: typeof mock }
  let handler: ReturnType<typeof vi.fn<(a: number, b: number) => void>>

  beforeEach(() => {
    mock = vi.fn((a: number, b: number) => a + b)
    target = { func: mock }
    handler = vi.fn()
  })

  test('is not detected as Proxy by is-proxy module when using bind', () => {
    const proxy = new Proxy(() => { }, {})
    expect(isProxy1(proxy)).toBe(true)

    // Without bind, Proxy is detectable
    const revokeWithoutBind = untouchable(target, 'func', () => { })
    expect(isProxy1(target.func)).toBe(true)
    revokeWithoutBind()

    // With bind, Proxy is undetectable
    const revoke = untouchable(target, 'func', handler, { bind: target })
    expect(isProxy1(target.func)).toBe(false)

    target.func(1, 2)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(1, 2)

    revoke()
  })

  test('is not detected as Proxy by node:util.types.isProxy when using bind', () => {
    const proxy = new Proxy(() => { }, {})
    expect(isProxy2(proxy)).toBe(true)

    // Without bind, Proxy is detectable
    const revokeWithoutBind = untouchable(target, 'func', () => { })
    expect(isProxy2(target.func)).toBe(true)
    revokeWithoutBind()

    // With bind, Proxy is undetectable
    const revoke = untouchable(target, 'func', handler, { bind: target })
    expect(isProxy2(target.func)).toBe(false)

    target.func(1, 2)
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith(1, 2)

    revoke()
  })

  test('revoke restores original function identity', () => {
    const obj = { fn: () => { } }
    const original = obj.fn

    const revoke = untouchable(obj, 'fn', () => { })

    expect(obj.fn).not.toBe(original) // patched function differs

    revoke()
    expect(obj.fn).toBe(original) // restored to exact original
  })

  test('function is Proxy without bind option', () => {
    const obj = { fn: (x: number) => x }

    const revoke = untouchable(obj, 'fn', () => { })

    // Without bind, function is a Proxy
    expect(isProxy1(obj.fn)).toBe(true)
    expect(isProxy2(obj.fn)).toBe(true)

    revoke()
  })

  test('function is not Proxy after revoke (without bind)', () => {
    const obj = { fn: (x: number) => x }

    const revoke = untouchable(obj, 'fn', () => { })

    // Before revoke: Proxy
    expect(isProxy1(obj.fn)).toBe(true)
    expect(isProxy2(obj.fn)).toBe(true)

    revoke()

    // After revoke: not a Proxy anymore
    expect(isProxy1(obj.fn)).toBe(false)
    expect(isProxy2(obj.fn)).toBe(false)
  })

  test('toString is Proxy without bind option', () => {
    const obj = { fn: (x: number) => x }

    const revoke = untouchable(obj, 'fn', () => { })

    // toString is a Proxy (from get trap)
    const toString = obj.fn.toString
    expect(isProxy1(toString)).toBe(true)
    expect(isProxy2(toString)).toBe(true)

    revoke()
  })

  test('toString is not Proxy after revoke (without bind)', () => {
    const obj = { fn: (x: number) => x }

    const revoke = untouchable(obj, 'fn', () => { })

    // Before revoke: toString is Proxy
    const toStringBefore = obj.fn.toString
    expect(isProxy1(toStringBefore)).toBe(true)
    expect(isProxy2(toStringBefore)).toBe(true)

    revoke()

    // After revoke: toString is not Proxy
    const toStringAfter = obj.fn.toString
    expect(isProxy1(toStringAfter)).toBe(false)
    expect(isProxy2(toStringAfter)).toBe(false)
  })

  test('function and toString both not Proxy after revoke (without bind)', () => {
    const obj = { fn: (x: number) => x }
    const originalFn = obj.fn
    const originalToString = obj.fn.toString

    const revoke = untouchable(obj, 'fn', () => { })

    // During patch
    expect(isProxy1(obj.fn)).toBe(true)
    expect(isProxy2(obj.fn)).toBe(true)
    expect(isProxy1(obj.fn.toString)).toBe(true)
    expect(isProxy2(obj.fn.toString)).toBe(true)

    revoke()

    // After revoke: everything restored
    expect(obj.fn).toBe(originalFn)
    expect(obj.fn.toString).toBe(originalToString)
    expect(isProxy1(obj.fn)).toBe(false)
    expect(isProxy2(obj.fn)).toBe(false)
    expect(isProxy1(obj.fn.toString)).toBe(false)
    expect(isProxy2(obj.fn.toString)).toBe(false)
  })

  test('preserves toString of patched function', () => {
    const obj = { fn1: (variable: number) => variable }

    const originalToString = obj.fn1.toString()

    const localHandler = vi.fn()
    untouchable(obj, 'fn1', localHandler)

    const patchedToString = obj.fn1.toString()

    expect(patchedToString).toBe(originalToString)
    expect(obj.fn1.toString.name).toBe('toString')
  })

  test('preserves toString chain recursively', () => {
    const obj = { fn: (x: number) => x * 2 }

    const originalToString = obj.fn.toString()
    const originalToStringToString = obj.fn.toString.toString()
    const originalToStringToStringToString = obj.fn.toString.toString.toString()

    untouchable(obj, 'fn', () => { })

    // All levels preserved
    expect(obj.fn.toString()).toBe(originalToString)
    expect(obj.fn.toString.toString()).toBe(originalToStringToString)
    expect(obj.fn.toString.toString.toString()).toBe(originalToStringToStringToString)

    // Names preserved at all levels
    expect(obj.fn.toString.name).toBe('toString')
    expect(obj.fn.toString.toString.name).toBe('toString')
    expect(obj.fn.toString.toString.toString.name).toBe('toString')
  })

  test('toString chain works infinitely deep', () => {
    const obj = { fn: (x: number) => x }

    untouchable(obj, 'fn', () => { })

    // Navigate 10 levels deep
    let current: any = obj.fn
    for (let i = 0; i < 10; i++) {
      current = current.toString
      expect(typeof current).toBe('function')
      expect(current.name).toBe('toString')
    }
  })

  test('respects Function.prototype.toString override', () => {
    const obj = { fn: (x: number) => x }

    const originalPrototypeToString = Function.prototype.toString

    Function.prototype.toString = function () {
      return 'overridden'
    }

    try {
      const originalResult = obj.fn.toString()

      untouchable(obj, 'fn', () => { })

      const patchedResult = obj.fn.toString()

      expect(patchedResult).toBe(originalResult)
      expect(patchedResult).toBe('overridden')
    }
    finally {
      Function.prototype.toString = originalPrototypeToString
    }
  })

  test('toString works correctly after revoke', () => {
    const obj = { fn: (x: number) => x * 3 }

    const originalToString = obj.fn.toString()

    const revoke = untouchable(obj, 'fn', () => { })

    expect(obj.fn.toString()).toBe(originalToString)
    expect(obj.fn.toString.length).toBe(0)

    revoke()

    expect(obj.fn.toString()).toBe(originalToString)
    expect(obj.fn.toString.length).toBe(0)
  })

  test('toString with bind option maintains toString characteristics', () => {
    const obj = {
      fn: function myFunc(x: number) {
        return x
      },
    }

    const bindContext = { value: 1 }

    const originalToString = obj.fn.toString()

    untouchable(obj, 'fn', () => { }, { bind: bindContext })

    expect(obj.fn.toString()).toBe(originalToString)
    expect(obj.fn.toString.toString).toBeDefined()
    expect(obj.fn.toString.name).toBe('toString')
  })

  test('preserves name property in deeply nested toString chains', () => {
    const obj = {
      fn: function myFunc() {
        return 42
      },
    }

    untouchable(obj, 'fn', () => { })

    // Access name at different levels of toString chain
    expect(obj.fn.name).toBe('myFunc')
    expect(obj.fn.toString.name).toBe('toString')

    // Deep chain: obj.fn.toString.toString.name
    const toStringToString = obj.fn.toString.toString
    expect(toStringToString.name).toBe('toString')

    // Access other properties on toString to trigger Reflect.get fallback
    expect(obj.fn.toString.length).toBe(0)
  })

  test('toString itself is not detected as Proxy without bind', () => {
    const obj = { fn: (x: number) => x }

    untouchable(obj, 'fn', () => { })

    // Without bind option, proxy is detectable on the function
    expect(isProxy1(obj.fn)).toBe(true)
    expect(isProxy2(obj.fn)).toBe(true)

    // But toString should also be a Proxy (created by get trap)
    const toString = obj.fn.toString
    expect(isProxy1(toString)).toBe(true)
    expect(isProxy2(toString)).toBe(true)
  })

  test('toString is Proxy but works correctly with bind option', () => {
    const obj = { fn: (x: number) => x }
    const bindContext = {}

    untouchable(obj, 'fn', () => { }, { bind: bindContext })

    // With bind option, function is not detectable
    expect(isProxy1(obj.fn)).toBe(false)
    expect(isProxy2(obj.fn)).toBe(false)

    // toString is still a Proxy (from createToStringProxy), but it's a bound proxy
    const toString = obj.fn.toString
    expect(isProxy1(toString)).toBe(true)
    expect(isProxy2(toString)).toBe(true)

    // But it still works correctly
    const originalToString = obj.fn.toString()
    expect(typeof originalToString).toBe('string')
    expect(originalToString).toContain('=>') // arrow function syntax

    // Deep chain also works
    expect(typeof toString.toString).toBe('function')
    expect(toString.name).toBe('toString')
  })
})

describe('untouchable with arbitrary bind values', () => {
  test('works with null bind value', () => {
    const obj = { fn: (x: number) => x * 2 }

    untouchable(obj, 'fn', () => { }, { bind: null as any })

    expect(obj.fn(5)).toBe(10)
  })

  test('works with undefined bind value', () => {
    const obj = { fn: (x: number) => x * 2 }

    untouchable(obj, 'fn', () => { }, { bind: undefined })

    expect(obj.fn(5)).toBe(10)
  })

  test('works with primitive bind values', () => {
    const obj = { fn: (x: number) => x * 2 }

    // Number
    untouchable(obj, 'fn', () => { }, { bind: 42 as any })
    expect(obj.fn(5)).toBe(10)
  })

  test('works with string bind value', () => {
    const obj = { fn: (x: number) => x * 2 }

    untouchable(obj, 'fn', () => { }, { bind: 'test' as any })
    expect(obj.fn(5)).toBe(10)
  })

  test('works with boolean bind value', () => {
    const obj = { fn: (x: number) => x * 2 }

    untouchable(obj, 'fn', () => { }, { bind: true as any })
    expect(obj.fn(5)).toBe(10)
  })

  test('works with array bind value', () => {
    const obj = { fn: (x: number) => x * 2 }

    untouchable(obj, 'fn', () => { }, { bind: [1, 2, 3] as any })
    expect(obj.fn(5)).toBe(10)
  })

  test('listener mode with null bind preserves original this context', () => {
    const obj = {
      multiplier: 3,
      fn: function (x: number) {
        return x * this.multiplier
      },
    }

    // In listener mode, bind only affects the listener, not the original function
    untouchable(obj, 'fn', () => { }, { bind: null as any })

    // Original function still uses obj as this
    expect(obj.fn(5)).toBe(15) // 5 * 3
  })

  test('original function with this context works with valid bind', () => {
    const obj = {
      multiplier: 3,
      fn: function (x: number) {
        return x * this.multiplier
      },
    }
    const customContext = { multiplier: 5 }

    untouchable(obj, 'fn', () => { }, { bind: customContext })

    // Should use customContext.multiplier
    expect(obj.fn(2)).toBe(10) // 2 * 5
  })

  test('replace mode with null bind preserves original behavior', () => {
    const obj = { fn: (x: number) => x + 1 }

    untouchable(obj, 'fn', (original, x) => {
      return original(x) * 2
    }, { replace: true, bind: null as any })

    expect(obj.fn(5)).toBe(12) // (5+1)*2
  })

  test('replace mode with primitive bind value', () => {
    const obj = { fn: (x: number) => x + 1 }

    untouchable(obj, 'fn', (original, x) => {
      return original(x) * 2
    }, { replace: true, bind: 123 as any })

    expect(obj.fn(5)).toBe(12) // (5+1)*2
  })

  test('replace mode with this-dependent function and null bind uses original context', () => {
    const obj = {
      multiplier: 10,
      fn: function (x: number) {
        return x * this.multiplier
      },
    }

    untouchable(obj, 'fn', (original, x) => {
      return original(x) + 1
    }, { replace: true, bind: null as any })

    // null is falsy, so bind falls back to thisArg (obj)
    // 5 * 10 + 1 = 51
    expect(obj.fn(5)).toBe(51)
  })

  test('replace mode with this-dependent function and empty object bind', () => {
    const obj = {
      multiplier: 10,
      fn: function (x: number) {
        return x * this.multiplier
      },
    }

    untouchable(obj, 'fn', (original, x) => {
      return original(x) + 1
    }, { replace: true, bind: {} as any })

    // Empty object doesn't have multiplier, so this.multiplier is undefined
    expect(obj.fn(5)).toBeNaN() // 5 * undefined + 1 = NaN
  })

  test('arrow function ignores bind context', () => {
    const obj = { fn: (x: number) => x * 2 }
    const customContext = { value: 100 }

    // Arrow functions ignore bind, so this should work fine
    untouchable(obj, 'fn', () => { }, { bind: customContext })

    expect(obj.fn(5)).toBe(10)
  })

  test('handler receives correct arguments with arbitrary bind', () => {
    const obj = { fn: (a: number, b: number) => a + b }
    const handler = vi.fn()

    untouchable(obj, 'fn', handler, { bind: 'arbitrary' as any })

    obj.fn(3, 7)

    expect(handler).toHaveBeenCalledWith(3, 7)
    expect(handler).toHaveBeenCalledOnce()
  })

  test('replacer receives correct arguments with arbitrary bind', () => {
    const obj = { fn: (a: number, b: number) => a + b }
    const replacer = vi.fn((original, a, b) => original(a, b) * 2)

    untouchable(obj, 'fn', replacer, { replace: true, bind: Symbol('test') as any })

    const result = obj.fn(3, 7)

    expect(result).toBe(20) // (3+7)*2
    expect(replacer).toHaveBeenCalledWith(expect.any(Function), 3, 7)
  })

  test('falsy bind values use original this context', () => {
    const obj = {
      multiplier: 5,
      fn: function (x: number) {
        return x * this.multiplier
      },
    }

    // Test with various falsy values
    const falsyValues = [null, undefined, 0, false, '']

    for (const falsyValue of falsyValues) {
      const testObj = { ...obj }
      untouchable(testObj, 'fn', (original, x) => original(x), { replace: true, bind: falsyValue as any })

      // All falsy bind values should use original context (testObj)
      expect(testObj.fn(3)).toBe(15) // 3 * 5
    }
  })

  test('truthy non-object bind values can cause errors with this-dependent functions', () => {
    const obj = {
      multiplier: 5,
      fn: function (x: number) {
        return x * this.multiplier
      },
    }

    // Bind to a number (truthy but no multiplier property)
    untouchable(obj, 'fn', (original, x) => original(x), { replace: true, bind: 123 as any })

    // Number(123).multiplier is undefined, so result is NaN
    expect(obj.fn(3)).toBeNaN()
  })

  test('truthy string bind value causes NaN with this-dependent functions', () => {
    const obj = {
      value: 10,
      fn: function (x: number) {
        return x + this.value
      },
    }

    untouchable(obj, 'fn', (original, x) => original(x), { replace: true, bind: 'test' as any })

    // String('test').value is undefined
    expect(obj.fn(5)).toBeNaN()
  })
})

describe('untouchable with bare option', () => {
  test('bare mode does not wrap toString', () => {
    const obj = { fn: (x: number) => x }

    untouchable(obj, 'fn', () => { }, { bare: true })

    // toString is not a Proxy in bare mode
    expect(isProxy1(obj.fn.toString)).toBe(false)
    expect(isProxy2(obj.fn.toString)).toBe(false)
  })

  test('bare mode toString still works', () => {
    const obj = {
      fn: function myFunc() {
        return 1
      },
    }

    untouchable(obj, 'fn', () => { }, { bare: true })

    // toString output might be different but still works
    expect(typeof obj.fn.toString()).toBe('string')
  })

  test('bare mode with Function.prototype.toString override', () => {
    const obj = { fn: () => 1 }

    const customToString = function () {
      return 'custom'
    }
    const originalProtoToString = Function.prototype.toString
    Function.prototype.toString = customToString

    try {
      untouchable(obj, 'fn', () => { }, { bare: true })

      // In bare mode, toString is not preserved
      expect(obj.fn.toString()).toBe('custom')
    }
    finally {
      Function.prototype.toString = originalProtoToString
    }
  })

  test('default mode (bare: false) wraps toString', () => {
    const obj = { fn: (x: number) => x }

    untouchable(obj, 'fn', () => { })

    // toString is a Proxy by default
    expect(isProxy1(obj.fn.toString)).toBe(true)
    expect(isProxy2(obj.fn.toString)).toBe(true)
  })

  test('bare mode with replace option', () => {
    const obj = { fn: (x: number) => x * 2 }

    untouchable(obj, 'fn', (original, x) => {
      return original(x) + 1
    }, { replace: true, bare: true })

    expect(obj.fn(5)).toBe(11) // (5 * 2) + 1

    expect(isProxy1(obj.fn.toString)).toBe(false)
  })

  test('bare mode with bind option', () => {
    const ctx = { value: 10 }
    const obj = { fn: (x: number) => x }

    untouchable(obj, 'fn', function (_x) {
      expect(this).toBe(ctx)
    }, { bare: true, bind: ctx })

    obj.fn(5)

    expect(isProxy2(obj.fn)).toBe(false) // bind makes it undetectable
    expect(isProxy2(obj.fn.toString)).toBe(false) // bare mode
  })

  test('bare mode revoke works correctly', () => {
    const obj = { fn: () => 1 }
    const original = obj.fn

    const revoke = untouchable(obj, 'fn', () => { }, { bare: true })

    expect(obj.fn).not.toBe(original)

    revoke()

    expect(obj.fn).toBe(original)
  })

  test('bare mode allows setting other properties on proxy', () => {
    const obj = { fn: () => 1 }

    untouchable(obj, 'fn', () => { }, { bare: true });

    // In bare mode, setting non-toString properties should work
    (<any>obj.fn).customProp = 'test'
    expect((obj.fn as any).customProp).toBe('test')
  })

  test('default mode allows setting other properties on proxy', () => {
    const obj = { fn: () => 1 }

    untouchable(obj, 'fn', () => { });

    // In default mode, setting non-toString properties should also work
    (<any>obj.fn).anotherProp = 'value'
    expect((obj.fn as any).anotherProp).toBe('value')
  })

  test('get trap fallback to createToStringProxy when patchedToString is not set', () => {
    const obj = {
      fn: function test() {
        return 1
      },
    }

    // Use bind option - this creates a bound function where setting toString doesn't trigger set trap
    const ctx = { value: 42 }
    untouchable(obj, 'fn', () => { }, { bind: ctx })

    // Accessing toString should work (triggers get trap on original proxy, then falls back)
    const toStr = obj.fn.toString
    expect(typeof toStr).toBe('function')
    expect(typeof toStr()).toBe('string')
  })
})

import { untouchable } from '../src'

describe('untouchable type tests', () => {
  test('Handler receives only function arguments (no original parameter)', () => {
    const obj = {
      add: (a: number, b: number) => a + b,
    }

    untouchable(obj, 'add', (a, b) => {
      expectTypeOf(a).toEqualTypeOf<number>()
      expectTypeOf(b).toEqualTypeOf<number>()
    })
  })

  test('ReplacedHandler receives original as first parameter', () => {
    const obj = {
      multiply: (a: number, b: number) => a * b,
    }

    untouchable(obj, 'multiply', (original, a, b) => {
      expectTypeOf(original).toEqualTypeOf<(a: number, b: number) => number>()
      expectTypeOf(a).toEqualTypeOf<number>()
      expectTypeOf(b).toEqualTypeOf<number>()
      return a * b
    }, { replace: true })
  })

  test('ReplacedHandler must return correct type', () => {
    const obj = {
      getValue: () => 42,
    }

    untouchable(obj, 'getValue', (original) => {
      expectTypeOf(original).toEqualTypeOf<() => number>()
      return 100
    }, { replace: true })
  })

  test('Handler preserves this context type', () => {
    const obj = {
      multiplier: 3,
      multiply(a: number, b: number) {
        return (a + b) * this.multiplier
      },
    }

    untouchable(obj, 'multiply', function (a, b) {
      expectTypeOf(this).toEqualTypeOf<typeof obj>()
      expectTypeOf(a).toEqualTypeOf<number>()
      expectTypeOf(b).toEqualTypeOf<number>()
    })
  })

  test('ReplacedHandler preserves this context type', () => {
    const obj = {
      value: 10,
      compute(n: number) {
        return n + this.value
      },
    }

    untouchable(obj, 'compute', function (original, n) {
      expectTypeOf(this).toEqualTypeOf<typeof obj>()
      expectTypeOf(original).toEqualTypeOf<(n: number) => number>()
      expectTypeOf(n).toEqualTypeOf<number>()
      return original(n) * 2
    }, { replace: true })
  })

  test('works with setTimeout', () => {
    untouchable(global, 'setTimeout', (handler, ms) => {
      expectTypeOf(handler).toBeFunction()
      expectTypeOf(ms).toEqualTypeOf<number | undefined>()
    })
  })

  test('works with async functions', () => {
    const obj = {
      asyncAdd: async (a: number, b: number) => a + b,
    }

    untouchable(obj, 'asyncAdd', async (original, a, b) => {
      expectTypeOf(original).toEqualTypeOf<(a: number, b: number) => Promise<number>>()
      expectTypeOf(a).toEqualTypeOf<number>()
      expectTypeOf(b).toEqualTypeOf<number>()
      return await original(a, b)
    }, { replace: true })
  })

  test('return type is Revoke function', () => {
    const obj = { fn: () => { } }
    const revoke = untouchable(obj, 'fn', () => { })

    expectTypeOf(revoke).toEqualTypeOf<() => void>()
  })

  test('bind option accepts any object', () => {
    const obj = { fn: () => { } }

    untouchable(obj, 'fn', () => { }, { bind: obj })
    untouchable(obj, 'fn', () => { }, { bind: {} })
    untouchable(obj, 'fn', () => { }) // without options
  })

  test('works with Symbol keys', () => {
    const key = Symbol('method')
    const obj = {
      [key]: (x: number) => x * 2,
    }

    untouchable(obj, key, (original, x) => {
      expectTypeOf(original).toEqualTypeOf<(x: number) => number>()
      expectTypeOf(x).toEqualTypeOf<number>()
      return original(x)
    }, { replace: true })
  })
})

// Type error tests (compile-time only, not executed)
if (false as boolean) {
  // @ts-expect-error - literal type is not assignable to object
  untouchable(1, 'abc', () => { })

  // @ts-expect-error - property value is not a function
  untouchable({ a: 1 }, 'a', () => { })

  // @ts-expect-error - 'noop' is not a property of global
  untouchable(global, 'noop', () => { })

  const obj = { add: (a: number, b: number) => a + b }

  // @ts-expect-error - handler signature must match when replace: true
  untouchable(obj, 'add', (_original, a, b, c) => a + b + c, { replace: true })

  // @ts-expect-error - return type must match when replace: true
  untouchable(obj, 'add', (): string => 'wrong', { replace: true })
}

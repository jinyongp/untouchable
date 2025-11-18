import { untouchable } from '../src'

const SymbolKey = Symbol('key')

class Example {
  multiplier = 3

  func(a: number, b: number) {
    return (a + b) * this.multiplier
  }

  async asyncFunc(a: number, b: number) {
    return Promise.resolve((a + b) * this.multiplier)
  }

  [SymbolKey](a: number, b: number) {
    return (a + b) * this.multiplier
  }
}

const example = new Example()

{
  function handler(this: Example, a: number, b: number) {
    console.assert(this instanceof Example)
    console.assert(this.multiplier === 3)
    console.assert(a === 1)
    console.assert(b === 2)
  }

  const revoke = untouchable(Example.prototype, 'func', handler)

  console.assert(example.func(1, 2) === 9, 'fails if not patched')

  revoke()

  console.assert(example.func(3, 4) === 21) // Not patched
}

const originalName = example.func.name
const originalToString = example.func.toString()
const originalToStringToString = example.func.toString.toString()
const originalToStringToStringToString = example.func.toString.toString.toString()

{
  const revoke = untouchable(Example.prototype, 'func', () => { })

  const patchedName = example.func.name

  console.assert(originalName === patchedName, 'fails if function name is not preserved')

  revoke()

  const revokedName = example.func.name

  console.assert(originalName === revokedName, 'fails if function name is not restored after revoke')
}

{
  const revoke = untouchable(Example.prototype, 'func', () => { })

  const patchedToString = example.func.toString()

  console.assert(originalToString === patchedToString, 'fails if toString is not preserved')

  revoke()

  const revokedToString = example.func.toString()

  console.assert(originalToString === revokedToString, 'fails if toString is not restored after revoke')
}

{
  const revoke = untouchable(Example.prototype, 'func', () => { })

  const patchedToStringToString = example.func.toString.toString()

  console.assert(originalToStringToString === patchedToStringToString, 'fails if toString.name is not preserved')

  revoke()

  const revokedToStringToString = example.func.toString.toString()

  console.assert(originalToStringToString === revokedToStringToString, 'fails if toString.name is not restored after revoke')
}

{
  const revoke = untouchable(Example.prototype, 'func', () => { })

  const patchedToStringToStringToString = example.func.toString.toString.toString()

  console.assert(originalToStringToStringToString === patchedToStringToStringToString, 'fails if toString.name.name is not preserved')

  revoke()

  const revokedToStringToStringToString = example.func.toString.toString.toString()

  console.assert(originalToStringToStringToString === revokedToStringToStringToString, 'fails if toString.name.name is not restored after revoke')
}

Function.prototype.toString = function () {
  return 'custom toString'
}

{
  const originalToString = Function.prototype.toString.call(example.func)

  const revoke = untouchable(Example.prototype, 'func', () => { })

  const patchedToString = example.func.toString()

  console.assert(originalToString === patchedToString, 'fails if toString is not preserved with custom toString implementation')

  revoke()
}

{
  const revoke1 = untouchable(Example.prototype, 'func', (original, a, b) => {
    return original(a * 2, b * 2)
  }, { replace: true })

  console.assert(example.func(2, 3) === 30, 'fails if not patched with different context')

  revoke1()

  const revoke2 = untouchable(Example.prototype, 'func', (_original, a, b) => {
    return a + b
  }, { replace: true })

  console.assert(example.func(2, 3) === 5, 'fails if not patched with different implementation')

  revoke2()

  console.assert(example.func(2, 3) === 15, 'fails if not revoked')
}

{
  const revoke = untouchable(Example.prototype, 'asyncFunc', async (original, a, b) => {
    const result = await original(a, b)
    return result + 1
  }, { replace: true })

  example.asyncFunc(1, 2).then((result) => {
    console.assert(result === 10, 'fails if not patched async function')
    revoke()
  })
}

{
  const revoke = untouchable(Example.prototype, SymbolKey, (original, a, b) => {
    return original(a + 1, b + 1)
  }, { replace: true })

  console.assert(example[SymbolKey](2, 3) === 21, 'fails if not patched symbol key method')

  revoke()
}

{
  const context = { multiplier: 4 }

  const revoke = untouchable(Example.prototype, 'func', function (_original, a, b) {
    console.assert(this === context, 'fails if this is not bound correctly')
    return (a + b) * this.multiplier
  }, { replace: true, bind: context })

  console.assert(example.func(1, 2) === 12, 'fails if not patched with bound context')

  revoke()

  console.assert(example.func(3, 4) === 21, 'fails if not revoked with bound context')
}

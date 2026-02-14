# untouchable

Type-safe function patching library using the [JavaScript Proxy API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

## Features

- Type-safe with full TypeScript support
- Reversible patches with revoke functions
- Stack multiple patches together
- Two modes: listener and replacer

## Installation

```bash
npm install untouchable
```

## Quick Start

```ts
import { untouchable } from 'untouchable'

const api = {
  fetchUser: (id: number) => fetch(`/api/users/${id}`),
}

// Log all API calls
const revoke = untouchable(api, 'fetchUser', (id) => {
  console.log(`Fetching user ${id}`)
})

api.fetchUser(123) // logs: "Fetching user 123"
revoke() // restore original function
```

## Usage

### Listener Mode

Observe function calls without modifying behavior.

```ts
class UserService {
  async login(email: string, password: string) {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return response.json()
  }
}

const service = new UserService()

// Track login attempts
const revoke = untouchable(service, 'login', function (email, password) {
  console.log(`Login attempt: ${email}`)
  // Can access instance properties via this
  console.log(this instanceof UserService) // true
})

await service.login('user@example.com', 'password')
// logs: "Login attempt: user@example.com"
// Still performs the actual login

revoke() // stop tracking
```

### Replace Mode

Modify function behavior by wrapping the original.

```ts
const cache = new Map()

const api = {
  async fetchData(id: number) {
    const response = await fetch(`/api/data/${id}`)
    return response.json()
  },
}

// Add caching
const revoke = untouchable(api, 'fetchData', async (original, id) => {
    if (cache.has(id)) {
      return cache.get(id)
    }
    const data = await original(id)
    cache.set(id, data)
    return data
  }, { replace: true })

await api.fetchData(1) // fetch from server
await api.fetchData(1) // return from cache

revoke() // disable caching
```

### Stacking Patches

Multiple patches create a chain.

```ts
const logger = {
  log: (message: string) => console.log(message),
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
```

### Custom Context Binding

Control the `this` context with the `bind` option.

```ts
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

counter.increment() // Returns: 101 (uses customContext.count)
```

## Cloak Mode

`cloak` option enables extra wrapping for the patched function's `toString` property.
By default, `untouchable` does not wrap `toString`. Set `cloak: true` to opt-in
to recursive `toString` wrapping (e.g., `fn.toString.toString...`) and additional
concealment behavior.

```ts
const objDefault = {
  fn() {
    return 'ok'
  },
}

const objCloak = {
  fn() {
    return 'ok'
  },
}

import { isProxy } from 'node:util/types'

const originalPrototypeToString = Function.prototype.toString

try {
  Function.prototype.toString = function () { return 'before' }

  // Default - toString is NOT wrapped
  untouchable(objDefault, 'fn', () => {})
  console.log(objDefault.fn.toString()) // prints 'before'

  // Cloak mode - toString is preserved by untouchable
  untouchable(objCloak, 'fn', () => {}, { cloak: true })

  console.log(objDefault.fn.toString()) // prints 'before'
  console.log(objCloak.fn.toString()) // prints 'before'

  console.log(isProxy(objDefault.fn.toString)) // false
  console.log(isProxy(objCloak.fn.toString)) // true
}
finally {
  Function.prototype.toString = originalPrototypeToString
}
```

## API Reference

### `untouchable(object, key, handler, options?)`

Patches a method on an object.

#### Parameters

- `object` - The object containing the method
- `key` - The method name to patch
- `handler` - Handler function (listener or replacer)
- `options` - Optional configuration
  - `replace` - Set to `true` for replacer mode (default: `false`)
  - `bind` - Bind handler to specific context
  - `cloak` - When set to `true` the function's `toString` property is wrapped
    to preserve a stable output even if `Function.prototype.toString` is
    overridden; default is `false`

#### Returns

`Revoke` function that removes the patch when called.

### Types

```ts
// Listener: observe calls
type Listener<T, K> = (this: T, ...args: Parameters<T[K]>) => void | undefined

// Replacer: wrap and modify
type Replacer<T, K> = (
  this: T,
  original: T[K],
  ...args: Parameters<T[K]>
) => ReturnType<T[K]>

// Options
type UntouchableOptions = {
  bind?: object
  cloak?: boolean
}

// Revoke function
type Revoke = () => void
```

## How It Works

Uses `Proxy.revocable()` to intercept function calls:

1. Creates a revocable proxy around the target function
2. Intercepts calls via the `apply` trap
3. Optionally preserves `toString` and other function properties
4. Stacks patches by wrapping previous ones
5. Restores to previous state on revoke

## Limitations

- Only works with functions (not getters/setters)
- Patched functions fail strict equality checks
- Revoking earlier patches orphans later ones in the chain

## License

MIT © [Jinyong Park](https://github.com/jinyongp)


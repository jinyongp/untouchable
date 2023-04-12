# untouchable

`untouchable` is a library that allows you to create non-intrusive monkey patches for functions using JavaScript Proxy API. It provides a convenient way to intercept function calls and access the values of the arguments at the time of the call through a callback function.

## Installation

Install the package using npm or yarn:

```sh
$ npm install untouchable
```

```sh
$ yarn add untouchable
```

## Usage

Here's an example of how to use the untouchable library:

```ts
import untouchable from 'untouchable';

const originalFunction = (a: number, b: number) => a + b;
const target = { myFunction: originalFunction };

const callback = function (this: typeof target, a: number, b: number) {
  console.log('Callback called with arguments:', a, b);
};

const options = {
  bind: target,
};

const revoke = untouchable(target, 'myFunction', callback, options);

// Calling the patched function
const result = target.myFunction(1, 2);
console.log('Result:', result); // 3

// Reverting back to the original function
revoke();
```

## API

### `untouchable`

```ts
function untouchable<T extends Record<PropertyKey, any>>(
  from: T,
  key: keyof T,
  handler: Handler<T>,
  options?: Options
): () => void;
```

- `from`: The object containing the function to be patched.
- `key`: The key of the function to be patched.
- `handler`: The callback function to be invoked when the patched function is called. It receives the same arguments as the original function.
- `options`: An optional object containing additional options.
  - `bind`: An optional object to which the Proxy should be bound. By default, the Proxy is not bound to any object.

## License

MIT

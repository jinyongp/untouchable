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
import { untouchable } from 'untouchable';

class Example {
  multiplier = 3;

  func(a: number, b: number) {
    return (a + b) * this.multiplier;
  }
}

function Patcher(this: Example, a: number, b: number) {
  console.log('Patched successfully!');
  console.assert(this instanceof Example);
  console.assert(this.multiplier === 3);
  console.assert(a === 1);
  console.assert(b === 2);
}

const revoke = untouchable(Example.prototype, 'func', Patcher);

const example = new Example();

console.assert(example.func(1, 2) === 9); // Patched

revoke();

console.assert(example.func(3, 4) === 21); // Not patched
```

## API

### `untouchable`

**Parameters**

- `from`: The object containing the function to be patched.
- `key`: The key of the function to be patched.
- `handler`: The callback function to be invoked when the patched function is called. It receives the same arguments as the original function.
- `options` (optional):
  - `bind`: An optional object to which the Proxy should be bound. By default, the Proxy is not bound to any object.

**Returns**

- `Revoke function`: call this to restore the original function.

## Limitations

- only works with functions that are not getters or setters.
- can be detected that function has been patched by strict equality check of the function reference.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

import { untouchable } from '../src';

class Example {
  multiplier = 3;

  func(a: number, b: number) {
    return (a + b) * this.multiplier;
  }
}

function handler(this: Example, a: number, b: number) {
  console.log('Patched successfully!');
  console.assert(this instanceof Example);
  console.assert(this.multiplier === 3);
  console.assert(a === 1);
  console.assert(b === 2);
}

const revoke = untouchable(Example.prototype, 'func', handler);

const example = new Example();

console.assert(example.func(1, 2) === 9); // Patched

revoke();

console.assert(example.func(3, 4) === 21); // Not patched

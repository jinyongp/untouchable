/** @see https://www.npmjs.com/package/is-proxy */
import 'is-proxy';
import { isProxy as isProxy1 } from 'is-proxy';

/** @see https://nodejs.org/api/util.html#utiltypesisproxyvalue */
import { isProxy as isProxy2 } from 'node:util/types';

import { Revoke, untouchable } from '../src';

describe('untouchable has functionality', () => {
  let mock: jest.Mock;
  let target: { func: typeof mock };
  let callback: jest.Mock;
  let revoke: Revoke;

  beforeEach(() => {
    mock = jest.fn((a: number, b: number) => a + b);
    target = { func: mock };
    callback = jest.fn();
    revoke = untouchable(target, 'func', callback);
  });

  test('callback is called when the patched function is invoked', () => {
    target.func(1, 2);
    expect(callback).toHaveBeenCalled();
  });

  test('callback receives the correct arguments', () => {
    target.func(1, 2);
    expect(callback).toHaveBeenCalledWith(1, 2);
  });

  test('original function context (this) is preserved', () => {
    const target = {
      multiplier: 3,
      func(a: number, b: number) {
        return (a + b) * this.multiplier;
      },
    };
    untouchable(target, 'func', callback);
    expect(target.func(1, 2)).toBe(9);
    expect(callback).toHaveBeenCalledWith(1, 2);
  });

  test('patched function is called after revoking', () => {
    revoke();
    target.func(1, 2);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('untouchable is undetectable', () => {
  let mock: jest.Mock;
  let target: { func: typeof mock };
  let callback: jest.Mock;
  let revoke: ReturnType<typeof untouchable>;

  beforeEach(() => {
    mock = jest.fn((a: number, b: number) => a + b);
    target = { func: mock };
    callback = jest.fn();
    revoke = untouchable(target, 'func', callback);
  });

  test('is not detected as a Proxy by is-proxy module', () => {
    const proxy = new Proxy(() => {}, {});
    expect(isProxy1(proxy)).toBe(true);

    {
      const revoke = untouchable(target, 'func', () => {}); // without bind
      expect(isProxy1(target.func)).toBe(true); // detected as a Proxy

      revoke();
    }

    {
      const revoke = untouchable(target, 'func', () => {}, { bind: target });
      expect(isProxy1(target.func)).toBe(false);

      target.func(1, 2);
      expect(callback).toHaveBeenCalledWith(1, 2);

      revoke();
    }
  });

  test('is not detected as a Proxy by node:util.types isProxy function', () => {
    const proxy = new Proxy(() => {}, {});
    expect(isProxy2(proxy)).toBe(true);

    untouchable(target, 'func', () => {}, { bind: target });

    {
      const revoke = untouchable(target, 'func', () => {}); // without bind
      expect(isProxy2(target.func)).toBe(true); // detected as a Proxy

      revoke();
    }

    {
      const revoke = untouchable(target, 'func', () => {}, { bind: target });
      expect(isProxy2(target.func)).toBe(false);

      target.func(1, 2);
      expect(callback).toHaveBeenCalledWith(1, 2);

      revoke();
    }
  });

  test('is not detected by strict equality check', () => {
    const obj = { fn: () => {} };

    const before = obj.fn;

    const revoke = untouchable(obj, 'fn', () => {});

    // expect(obj.fn).toEqual(before); // TODO: make this work

    revoke();
    expect(obj.fn).toEqual(before);
  });

  test('toString of the patched function displays the original function name and native code', () => {
    const obj = {
      fn1: (variable: string) => variable,
      fn2: (variable: string): string => variable,
      fn3: function (variable: string) {
        return variable;
      },
      fn4: function (variable: string): string {
        return variable;
      },
      fn5(variable: string) {
        return variable;
      },
      fn6(variable: string): string {
        return variable;
      },
      fn7: () => {},
    };

    obj.fn7.toString = () => 'CUSTOM';

    const proxy = Object.getPrototypeOf(Proxy);
    expect(`${proxy}`).toBe(`function () { [native code] }`);

    const targets = [...Object.values(obj), Proxy, proxy, String.toString];

    const cases = (target: string) => [
      target,
      target.toString,
      target.toString(),
      target.toString.toString,
      target.toString.toString(),
      target.toString().toString,
      target.toString().toString(),

      `${target}`,
      `${target.toString}`,
      `${target.toString()}`,
      `${target.toString.toString}`,
      `${target.toString.toString()}`,
      `${target.toString().toString}`,
      `${target.toString().toString()}`,
    ];

    const original = new Map(targets.map((target) => [target, cases(target)]));

    let key: keyof typeof obj;
    for (key in obj) {
      obj[key](key);
      expect(callback).not.toHaveBeenCalled();

      untouchable(obj, key, callback);

      obj[key](key);
      expect(callback).toHaveBeenCalledWith(key);
      callback.mockReset();
    }

    const patched = new Map(targets.map((target) => [target, cases(target)]));

    for (const [target, expected] of original) {
      expect(patched.get(target)).toEqual(expected);
    }
  });
});

try {
  // @ts-expect-error literal type is not assignable to object
  untouchable(1, 'abc', () => {});

  // @ts-expect-error property value is not a function
  untouchable({ a: 1 }, 'a', () => {});

  // @ts-expect-error 'noop' is not a property of global
  untouchable(global, 'noop', () => {});

  // @ts-expect-error handler signature does not match the target function
  untouchable(global, 'setTimeout', (a, b, c) => {});

  untouchable(global, 'setTimeout', (handler, ms) => {
    type cases = [
      Expect<Equal<typeof handler, (args: void) => void>>,
      Expect<Equal<typeof ms, number | undefined>>
    ];
  });
} catch {}

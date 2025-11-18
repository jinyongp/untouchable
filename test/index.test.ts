/** @see https://www.npmjs.com/package/is-proxy */
import 'is-proxy';
import { isProxy as isProxy1 } from 'is-proxy';

/** @see https://nodejs.org/api/util.html#utiltypesisproxyvalue */
import { isProxy as isProxy2 } from 'node:util/types';

import { untouchable } from '../src';

describe('untouchable has functionality', () => {
  let mock: ReturnType<typeof vi.fn<(a: number, b: number) => number>>;
  let target: { func: typeof mock };
  let callback: ReturnType<typeof vi.fn<(a: number, b: number) => void>>;

  beforeEach(() => {
    mock = vi.fn((a: number, b: number) => a + b);
    target = { func: mock };
    callback = vi.fn();
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
    const localCallback = vi.fn();
    untouchable(target, 'func', localCallback);
    expect(target.func(1, 2)).toBe(9);
    expect(localCallback).toHaveBeenCalledWith(1, 2);
  });

  test('patched function is called after revoking', () => {
    const revoke = untouchable(target, 'func', callback);
    target.func(1, 2);
    expect(callback).toHaveBeenCalledWith(1, 2);
    revoke();
    target.func(1, 2);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('untouchable is undetectable', () => {
  let mock: ReturnType<typeof vi.fn<(a: number, b: number) => number>>;
  let target: { func: typeof mock };
  let callback: ReturnType<typeof vi.fn<(a: number, b: number) => void>>;

  beforeEach(() => {
    mock = vi.fn((a: number, b: number) => a + b);
    target = { func: mock };
    callback = vi.fn();
  });

  test('is not detected as a Proxy by is-proxy module', () => {
    const proxy = new Proxy(() => { }, {});
    expect(isProxy1(proxy)).toBe(true);

    {
      const revoke = untouchable(target, 'func', () => { }); // without bind
      expect(isProxy1(target.func)).toBe(true); // detected as a Proxy

      revoke();
    }

    {
      const revoke = untouchable(target, 'func', () => { }, { bind: target });
      expect(isProxy1(target.func)).toBe(false);

      target.func(1, 2);
      expect(callback).toHaveBeenCalledWith(1, 2);

      revoke();
    }
  });

  test('is not detected as a Proxy by node:util.types isProxy function', () => {
    const proxy = new Proxy(() => { }, {});
    expect(isProxy2(proxy)).toBe(true);

    untouchable(target, 'func', () => { }, { bind: target });

    {
      const revoke = untouchable(target, 'func', () => { }); // without bind
      expect(isProxy2(target.func)).toBe(true); // detected as a Proxy

      revoke();
    }

    {
      const revoke = untouchable(target, 'func', () => { }, { bind: target });
      expect(isProxy2(target.func)).toBe(false);

      target.func(1, 2);
      expect(callback).toHaveBeenCalledWith(1, 2);

      revoke();
    }
  });

  test('is not detected by strict equality check', () => {
    const obj = { fn: () => { } };

    const before = obj.fn;

    const revoke = untouchable(obj, 'fn', () => { });

    // expect(obj.fn).toEqual(before); // TODO: make this work

    revoke();
    expect(obj.fn).toEqual(before);
  });

  test('toString of the patched function displays the original function name and native code', () => {
    const obj = {
      fn1: (variable: string) => variable,
      // fn2: (variable: string): string => variable,
      // fn3: function (variable: string) {
      //   return variable;
      // },
      // fn4: function (variable: string): string {
      //   return variable;
      // },
      // fn5(variable: string) {
      //   return variable;
      // },
      // fn6(variable: string): string {
      //   return variable;
      // },
      // fn7: () => {},
    };

    // obj.fn7.toString = () => 'CUSTOM';

    const proxy = Object.getPrototypeOf(Proxy);
    expect(`${proxy}`).toBe(`function () { [native code] }`);

    const cases = (target: any) => [
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

    const targets = [...Object.values(obj), Proxy, proxy, String.toString];
    const original = targets.map((t) => cases(t));

    const localCallback = vi.fn();
    let key: keyof typeof obj;
    for (key in obj) {
      obj[key](key);
      expect(localCallback).not.toHaveBeenCalled();

      untouchable(obj, key, localCallback);

      obj[key](key);
      expect(localCallback).toHaveBeenCalledWith(key);
      localCallback.mockReset();
    }

    const newTargets = [...Object.values(obj), Proxy, proxy, String.toString];
    const patched = newTargets.map((t) => cases(t));

    for (let i = 0; i < original.length; i++) {
      expect(patched[i]).toEqual(original[i]);
    }
  });
});

// TODO: index.test-d.ts
try {
  // @ts-expect-error literal type is not assignable to object
  untouchable(1, 'abc', () => { });

  // @ts-expect-error property value is not a function
  untouchable({ a: 1 }, 'a', () => { });

  // @ts-expect-error 'noop' is not a property of global
  untouchable(global, 'noop', () => { });

  // @ts-expect-error handler signature does not match the target function
  untouchable(global, 'setTimeout', (a, b, c) => { });

  untouchable(global, 'setTimeout', (handler, ms) => {
    type cases = [
      Expect<Equal<typeof handler, (args: void) => void>>,
      Expect<Equal<typeof ms, number | undefined>>
    ];
  });
} catch { }

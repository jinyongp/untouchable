/** @see https://www.npmjs.com/package/is-proxy */
import 'is-proxy';
import { isProxy as isProxy1 } from 'is-proxy';

/** @see https://nodejs.org/api/util.html#utiltypesisproxyvalue */
import { isProxy as isProxy2 } from 'node:util/types';

import untouchable from '.';

describe('untouchable: functionality', () => {
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
});

describe('untouchable: undetectable', () => {
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

  test.skip('is not detected as a Proxy by is-proxy module', () => {
    const proxy = new Proxy(() => {}, {});
    expect(isProxy1(proxy)).toBe(true);

    expect(isProxy1(target)).toBe(false);
    expect(isProxy1(target.func)).toBe(false);
  });

  test.skip('is not detected as a Proxy by node:util.types isProxy function', () => {
    const proxy = new Proxy(() => {}, {});
    expect(isProxy2(proxy)).toBe(true);

    expect(isProxy2(target)).toBe(false);
    expect(isProxy2(target.func)).toBe(false);
  });

  test('toString of the patched function displays the original function name and native code', () => {
    const native = (name: string) => `function ${name}() { [native code] }`;

    const obj = {
      foo: 'bar',
      touchable(variable: string) {
        return variable;
      },
    };

    const proxy = Object.getPrototypeOf(Proxy);
    expect(`${proxy}`).toBe(native(''));

    const assertions = [
      [obj.touchable, native('touchable')],
      [Proxy, native('Proxy')],
      [proxy, native('')],
    ];

    untouchable(obj, 'touchable', () => {});
    expect(`${obj.touchable}`).not.toBe(native(''));

    assertions.forEach(([target, expected]) => {
      expect(`${target}`).toBe(expected);
      expect(target.toString()).toBe(expected);

      expect(`${target.toString}`).toBe(native('toString'));
      expect(target.toString.toString()).toBe(native('toString'));
    });
  });
});

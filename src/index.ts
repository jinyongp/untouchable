export type Options = {
  bind?: object;
};

type Handler<T extends Record<PropertyKey, any>> = (
  this: T,
  ...args: Parameters<T[keyof T]>
) => any;

function untouchable<T extends Record<PropertyKey, any>>(
  from: T,
  key: keyof T,
  handler: Handler<T>,
  options?: Options
) {
  const { bind = false } = options ?? {};

  const _ = Proxy.revocable(from[key], {
    apply(target, thisArg: T, args) {
      Reflect.apply(handler, thisArg, args);
      return Reflect.apply(target, thisArg, args);
    },
  });

  const prototype = Object.getPrototypeOf(from[key]);
  const _toString = prototype.toString;
  prototype.toString = new Proxy(prototype.toString, {
    apply: (__, thisArg) => `function ${thisArg.name}() { [native code] }`,
  });

  const _fromKey = from[key];
  from[key] = bind ? _.proxy.bind(bind) : _.proxy;
  return () => {
    _.revoke();
    from[key] = _fromKey;
    prototype.toString = _toString;
  };
}

export default untouchable;

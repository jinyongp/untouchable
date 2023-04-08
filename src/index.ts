export type Options = {
  /**
   * @default false
   */
  bind?: object;
};

function untouchable<
  From extends Record<PropertyKey, any>,
  Key extends keyof From,
  Args extends Parameters<From[Key]>
>(
  from: From,
  key: Key,
  handler: (this: From, ...args: Args) => void,
  options?: Options
) {
  const { bind = false } = options ?? {};

  const _ = Proxy.revocable(from[key], {
    apply(target, thisArg: From, args: Args) {
      Reflect.apply(handler, thisArg, args);
      return Reflect.apply(target, thisArg, args);
    },
  });

  const prototype = Object.getPrototypeOf(from[key]);
  prototype.toString = new Proxy(prototype.toString, {
    apply: (__, thisArg) => `function ${thisArg.name}() { [native code] }`,
  });

  from[key] = bind ? _.proxy.bind(bind) : _.proxy;
  return _.revoke;
}

export default untouchable;

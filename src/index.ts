export type Options = {
  bind?: object;
};

export type Handler<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
  P extends Parameters<T[K]> = Parameters<T[K]>
> = (this: T, ...args: P) => any;

export type Revoke = () => void;

export function untouchable<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>
>(from: T, key: K, handler: Handler<T, K>, options?: Options): Revoke {
  const { bind = false } = options ?? {};

  const { proxy, revoke } = Proxy.revocable(from[key], {
    get(target, prop, receiver) {
      return Reflect.get(target, prop, receiver);
    },
    apply(target, thisArg: T, args) {
      Reflect.apply(handler, thisArg, args);
      return Reflect.apply(target, thisArg, args);
    },
  });

  const func = from[key];
  from[key] = bind ? proxy.bind(bind) : proxy;
  return () => {
    revoke();
    from[key] = func;
  };
}

type Methods<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

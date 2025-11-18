export type Listener<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
  P extends Parameters<T[K]> = Parameters<T[K]>,
> = (this: T, ...args: P) => void | undefined

export type Replacer<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
  P extends Parameters<T[K]> = Parameters<T[K]>,
  R extends ReturnType<T[K]> = ReturnType<T[K]>,
> = (this: T, original: T[K], ...args: P) => R

export type UntouchableOptions = {
  bind?: object
}

export type Revoke = () => void

type AnyFunction = (...args: any[]) => any

type Methods<T> = {
  [K in keyof T]: T[K] extends AnyFunction ? K : never;
}[keyof T]

function createToStringProxy(fn: AnyFunction, context: AnyFunction) {
  return new Proxy(fn.bind(context), {
    get(target, prop) {
      if (prop === 'name') {
        return fn.name
      }
      if (prop === 'toString') {
        return createToStringProxy(fn.toString, fn)
      }
      return Reflect.get(target, prop)
    },
    apply(_target, _thisArg, args) {
      return Reflect.apply(fn, context, args)
    },
  })
}

export function untouchable<T extends Record<PropertyKey, any>, K extends Methods<T>>(object: T, key: K, listener: Listener<T, K>, options?: UntouchableOptions & { replace?: false }): Revoke
export function untouchable<T extends Record<PropertyKey, any>, K extends Methods<T>>(object: T, key: K, replacer: Replacer<T, K>, options?: UntouchableOptions & { replace: true }): Revoke
export function untouchable<T extends Record<PropertyKey, any>, K extends Methods<T>>(object: T, key: K, func: Listener<T, K> | Replacer<T, K>, options?: UntouchableOptions & { replace?: boolean }): Revoke {
  const bind = options?.bind
  const previous = object[key]

  const { proxy, revoke: revokeProxy } = Proxy.revocable(previous, {
    apply(_target, thisArg: T, args) {
      if (options?.replace) {
        const bound = bind ? previous.bind(bind) : previous.bind(thisArg)
        return Reflect.apply(func, thisArg, [bound, ...args])
      }

      Reflect.apply(func, thisArg, args)
      return Reflect.apply(previous, thisArg, args)
    },
    get(target, prop) {
      if (prop === 'toString') {
        return createToStringProxy(previous.toString, previous)
      }
      return Reflect.get(target, prop)
    },
  })

  const bound = bind ? proxy.bind(bind) : proxy

  object[key] = bound

  if (bind) {
    bound.toString = createToStringProxy(previous.toString, previous)
  }

  return () => {
    revokeProxy()
    object[key] = previous
  }
}

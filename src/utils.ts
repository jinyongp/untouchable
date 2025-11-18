import type { AnyFunction } from './types'

/**
 * Creates a Proxy that recursively preserves toString behavior.
 * This allows infinite toString chaining (fn.toString.toString.toString...).
 */
export function createToStringProxy(fn: AnyFunction, context: AnyFunction) {
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

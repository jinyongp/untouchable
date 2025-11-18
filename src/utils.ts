import type { AnyFunction } from './types'

/**
 * Creates a Proxy that recursively preserves toString behavior.
 * This allows infinite toString chaining (fn.toString.toString.toString...).
 *
 * The proxy intercepts property access to:
 * - Return the original function name for 'name' property
 * - Return a recursive proxy for 'toString' property (enabling infinite chaining)
 * - Delegate other property access to the bound function
 *
 * When called, it applies the original function with the correct context.
 *
 * @param fn - The function whose toString behavior to preserve
 * @param context - The context to bind the function to
 * @returns A Proxy that preserves toString chains infinitely
 *
 * @internal
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

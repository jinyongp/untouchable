import type { Listener, Replacer, Options, Revoke, Methods } from './types'
import { createToStringProxy } from './utils'

/**
 * Patches a method on an object to intercept calls with a listener.
 * Returns a revoke function that restores the previous state.
 *
 * @example
 * ```ts
 * const obj = { greet: (name: string) => `Hello, ${name}!` }
 *
 * // Listen mode: intercept calls without modifying behavior
 * const revoke = untouchable(obj, 'greet', (name) => {
 *   console.log('greet was called with:', name)
 * })
 *
 * obj.greet('World') // logs: "greet was called with: World"
 * // Returns: "Hello, World!"
 *
 * revoke() // restore original function
 * ```
 */
export function untouchable<T extends Record<PropertyKey, any>, K extends Methods<T>>(
  object: T,
  key: K,
  listener: Listener<T, K>,
  options?: Options & { replace?: false },
): Revoke

/**
 * Patches a method on an object to replace its behavior.
 * The replacer receives the original function and can modify the return value.
 * Returns a revoke function that restores the previous state.
 *
 * @example
 * ```ts
 * const obj = { add: (a: number, b: number) => a + b }
 *
 * // Replace mode: modify the return value
 * const revoke = untouchable(obj, 'add', (original, a, b) => {
 *   const result = original(a, b)
 *   return result * 2
 * }, { replace: true })
 *
 * obj.add(2, 3) // Returns: 10 (instead of 5)
 *
 * revoke() // restore original function
 * ```
 *
 * @example
 * ```ts
 * // Multiple patches stack - they chain together
 * const obj = { value: (n: number) => n }
 *
 * const revoke1 = untouchable(obj, 'value', (original, n) => {
 *   return original(n) * 2
 * }, { replace: true })
 *
 * const revoke2 = untouchable(obj, 'value', (original, n) => {
 *   return original(n) + 1
 * }, { replace: true })
 *
 * obj.value(5) // Returns: 11 ((5 * 2) + 1)
 *
 * revoke2() // back to first patch
 * obj.value(5) // Returns: 10 (5 * 2)
 *
 * revoke1() // back to original
 * obj.value(5) // Returns: 5
 * ```
 *
 * @example
 * ```ts
 * // Use bind option to make patches undetectable by Proxy detection
 * import { isProxy } from 'node:util/types'
 *
 * const obj = { fn: () => 'result' }
 *
 * // Without bind: detectable
 * untouchable(obj, 'fn', () => {})
 * isProxy(obj.fn) // true
 *
 * // With bind: undetectable
 * untouchable(obj, 'fn', () => {}, { bind: obj })
 * isProxy(obj.fn) // false
 * ```
 */
export function untouchable<T extends Record<PropertyKey, any>, K extends Methods<T>>(
  object: T,
  key: K,
  replacer: Replacer<T, K>,
  options?: Options & { replace: true },
): Revoke

export function untouchable<T extends Record<PropertyKey, any>, K extends Methods<T>>(
  object: T,
  key: K,
  func: Listener<T, K> | Replacer<T, K>,
  options?: Options & { replace?: boolean },
): Revoke {
  const bind = options?.bind
  const cloak = options?.cloak
  const previous = object[key]
  const previousToString = previous.toString
  let patchedToString: any

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
      if (cloak && prop === 'toString') {
        return patchedToString
      }
      return Reflect.get(target, prop)
    },
    set(target, prop, value) {
      if (cloak && prop === 'toString') {
        patchedToString = value
        return true
      }
      return Reflect.set(target, prop, value)
    },
  })

  const patched = bind ? proxy.bind(bind) : proxy
  if (cloak) patched.toString = createToStringProxy(previousToString, previous)
  object[key] = patched

  return () => {
    revokeProxy()
    object[key] = previous
  }
}

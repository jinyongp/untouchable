/**
 * A listener function that is called before the original function executes.
 * Does not receive the original function and cannot modify the return value.
 * The original function will still execute after the listener.
 *
 * @template T - The object type containing the method
 * @template K - The method key
 * @template P - The parameters of the method
 *
 * @example
 * ```ts
 * const obj = { add: (a: number, b: number) => a + b }
 *
 * const listener: Listener<typeof obj, 'add'> = function(a, b) {
 *   console.log('add called with:', a, b)
 *   // Cannot modify return value
 * }
 * ```
 */
export type Listener<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
> = (this: T, ...args: Parameters<T[K]>) => void | undefined

/**
 * A replacer function that wraps the original function and can modify its behavior.
 * Receives the original (or previous patch) function as the first parameter.
 * Must return a value matching the original function's return type.
 *
 * @template T - The object type containing the method
 * @template K - The method key
 * @template P - The parameters of the method
 * @template R - The return type of the method
 *
 * @example
 * ```ts
 * const obj = { add: (a: number, b: number) => a + b }
 *
 * const replacer: Replacer<typeof obj, 'add'> = function(original, a, b) {
 *   const result = original(a, b)
 *   return result * 2 // Modify the return value
 * }
 * ```
 */
export type Replacer<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
> = (this: T, original: T[K], ...args: Parameters<T[K]>) => ReturnType<T[K]>

/**
 * Options for configuring the untouchable patch behavior.
 */
export type Options = {
  /**
   * Bind the handler/replacer to a specific context object.
   *
   * When provided:
   * - The handler/replacer's `this` will be bound to this object
   * - The patched function becomes undetectable by Proxy detection tools
   *   (e.g., `isProxy` from 'is-proxy' or 'node:util/types')
   *
   * When omitted:
   * - The handler/replacer's `this` preserves the original calling context
   * - The patched function is detectable as a Proxy
   *
   * @example
   * ```ts
   * import { isProxy } from 'node:util/types'
   *
   * const obj = { fn: () => 'result' }
   * const customContext = { value: 42 }
   *
   * // Without bind - Proxy is detectable
   * untouchable(obj, 'fn', function() {})
   * isProxy(obj.fn) // true
   *
   * // With bind - Proxy is undetectable
   * untouchable(obj, 'fn', function() {
   *   console.log(this.value) // 42
   * }, { bind: customContext })
   * isProxy(obj.fn) // false
   * ```
   */
  bind?: object

  /**
   * Use bare mode - skip wrapping toString with Proxy.
   *
   * When true:
   * - Only the function itself is wrapped with Proxy
   * - The `toString` property is not modified
   * - Slightly better performance and simpler behavior
   *
   * When false (default):
   * - Both function and toString are wrapped with Proxy
   * - Preserves toString behavior even when Function.prototype.toString is overridden
   * - More thorough concealment of the patch
   *
   * @example
   * ```ts
   * const obj = { fn: () => 'result' }
   *
   * // Default - toString is also wrapped
   * untouchable(obj, 'fn', () => {})
   * obj.fn.toString() // Returns original toString output
   *
   * // Bare mode - toString is not wrapped
   * untouchable(obj, 'fn', () => {}, { bare: true })
   * obj.fn.toString // May behave differently
   * ```
   */
  bare?: boolean
}

/**
 * A function that revokes the patch and restores the previous state.
 *
 * When called:
 * - Removes the current patch
 * - Restores the function to its previous state (could be original or an earlier patch)
 * - Safe to call multiple times (subsequent calls have no effect)
 *
 * @example
 * ```ts
 * const revoke = untouchable(obj, 'method', handler)
 *
 * // Later...
 * revoke() // Restore to previous state
 * revoke() // Safe - no error
 * ```
 */
export type Revoke = () => void

/** @internal */
export type AnyFunction = (...args: any[]) => any

/** @internal */
export type Methods<T> = {
  [K in keyof T]: T[K] extends AnyFunction ? K : never
}[keyof T]

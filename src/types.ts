/**
 * A handler function that is called before the original function executes.
 * Does not receive the original function and cannot modify the return value.
 *
 * @template T - The object type containing the method
 * @template K - The method key
 * @template P - The parameters of the method
 */
export type Listener<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
  P extends Parameters<T[K]> = Parameters<T[K]>,
> = (this: T, ...args: P) => void | undefined

/**
 * A replacer function that wraps the original function and can modify its behavior.
 * Receives the original function as the first parameter.
 *
 * @template T - The object type containing the method
 * @template K - The method key
 * @template P - The parameters of the method
 * @template R - The return type of the method
 */
export type Replacer<
  T extends Record<PropertyKey, any>,
  K extends Methods<T>,
  P extends Parameters<T[K]> = Parameters<T[K]>,
  R extends ReturnType<T[K]> = ReturnType<T[K]>,
> = (this: T, original: T[K], ...args: P) => R

/**
 * Options for the untouchable function.
 */
export type UntouchableOptions = {
  /**
   * Bind the handler/replacer to a specific context.
   * When provided, makes the patched function undetectable by Proxy detection tools.
   */
  bind?: object
}

/**
 * A function that revokes the patch and restores the previous state.
 */
export type Revoke = () => void

export type AnyFunction = (...args: any[]) => any

export type Methods<T> = {
  [K in keyof T]: T[K] extends AnyFunction ? K : never
}[keyof T]

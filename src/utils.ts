import type { AnyFunction, PatchMetadata } from './types'

const patchMetadata = new WeakMap<AnyFunction, PatchMetadata>()

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

/**
 * Register metadata for a patched function so revoke ordering
 * can be resolved safely.
 *
 * @internal
 */
export function registerPatchMetadata(
  patched: AnyFunction,
  previous: AnyFunction,
) {
  const metadata: PatchMetadata = {
    previous,
    revoked: false,
  }
  patchMetadata.set(patched, metadata)
  return metadata
}

/**
 * Mark patch metadata as revoked exactly once.
 *
 * @internal
 */
export function revokePatchMetadata(metadata: PatchMetadata) {
  if (metadata.revoked) return false
  metadata.revoked = true
  return true
}

/**
 * Resolve a function reference to the nearest non-revoked function
 * in a stacked patch chain.
 *
 * @internal
 */
export function resolveActiveFunction(func: AnyFunction) {
  let active = func
  let metadata = patchMetadata.get(active)

  while (metadata?.revoked) {
    active = metadata.previous
    metadata = patchMetadata.get(active)
  }

  return active
}

/**
 * Check whether `toString` can be safely intercepted without
 * violating Proxy invariants.
 *
 * @internal
 */
export function canInterceptToString(target: AnyFunction) {
  const descriptor = Reflect.getOwnPropertyDescriptor(target, 'toString')
  if (!descriptor) return true

  if ('value' in descriptor) {
    return descriptor.configurable || descriptor.writable
  }

  return descriptor.configurable || descriptor.get !== undefined
}

import { untouchable } from '../src'

export interface Options {
  log(message?: any, ...optionalParams: any[]): void
}

export interface Handler {
  (func: typeof untouchable, options: Options): Promise<void> | void
}

export function example(handler: Handler) {
  return (options: Options) => handler(untouchable, options)
}

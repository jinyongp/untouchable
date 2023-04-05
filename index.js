function patch(source, handler) {
  const proxy = new Proxy(source, {
    apply(target, thisArg, args) {
      handler.apply(thisArg, args);
      return target.apply(thisArg, args);
    },
  });
  const prototype = Object.getPrototypeOf(proxy);
  prototype.toString = new Proxy(prototype.toString, {
    apply: (_, thisArg) => `function ${thisArg.name}() { [native code] }`,
  });
  return proxy;
}

module.exports = { patch };

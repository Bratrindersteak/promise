export function iterableToArray(iterable) {
  if (typeof iterable[Symbol.iterator] !== 'function') {
    throw new TypeError(`${typeof iterable} is not iterable (cannot read property Symbol(Symbol.iterator))`);
  }

  return Array.isArray(iterable) ? iterable : Array.from(iterable);
}

export function isThenableObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]' && typeof value.then === 'function' && value.then.length === 2;
}

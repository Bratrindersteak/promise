export function iterableToArray(iterable) {
  if (typeof iterable[Symbol.iterator] !== 'function') {
    throw new TypeError(`${typeof iterable} is not iterable (cannot read property Symbol(Symbol.iterator))`);
  }

  return Array.isArray(iterable) ? iterable : Array.from(iterable);
}

export function isThenableObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]' && typeof value.then === 'function' && value.then.length === 2;
}

export function handler(promise, callback, resolve, reject) {
  queueMicrotask(() => {
    try {
      resolvePromise(promise, callback(), resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

export function resolvePromise(promise, result, resolve, reject) {
  if (result === promise) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
  }

  if (typeof result === 'function' || (typeof result === 'object' && result !== null)) {
    if (typeof result.then === 'function') {
      try {
        result.then.call(result, value => { resolvePromise(promise, value, resolve, reject) }, reason => { reject(reason) });
      } catch(error) {
        reject(error);
      }
    } else {
      resolve(result);
    }
  } else {
    resolve(result);
  }
}

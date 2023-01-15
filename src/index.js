class Promise {
  #status;
  #result;
  #callbacks;

  #PENDING = 'pending';
  #FULFILLED = 'fulfilled';
  #REJECTED = 'rejected';

  #OBJECT = 'object';
  #FUNCTION = 'function';

  constructor(executor) {
    if (!this instanceof this.constructor) {
      throw new TypeError('Promise constructor cannot be invoked without \'new\'');
    }

    if (typeof executor !== this.#FUNCTION) {
      throw TypeError(`Promise resolver ${executor} is not a function`);
    }

    this.#status = this.#PENDING;
    this.#callbacks = [];

    const resolve = (value) => {
      if (this.#status === this.#PENDING) {
        this.#status = this.#FULFILLED;
        this.#result = value;

        while (this.#callbacks.length) {
          const { onFulfilled } = this.#callbacks.shift();

          onFulfilled();
        }
      }
    };

    const reject = (reason) => {
      if (this.#status === this.#PENDING) {
        this.#status = this.#REJECTED;
        this.#result = reason;

        while (this.#callbacks.length) {
          const { onRejected } = this.#callbacks.shift();

          onRejected();
        }
      }
    };

    try {
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === this.#FUNCTION ? onFulfilled : value => value;
    onRejected = typeof onRejected === this.#FUNCTION ? onRejected : reason => { throw reason };

    const handleResult = (instance, result, resolve, reject) => {
      if (result === instance) {
        return reject(new TypeError('Chaining cycle detected for promise #<Promise>'));
      }

      if (result !== null && [this.#OBJECT, this.#FUNCTION].includes(typeof result)) {
        let called = false;

        try {
          const then = result.then;

          if (typeof then === this.#FUNCTION) {
            then.call(result, (value) => {
              if (called) {
                return;
              }

              called = true;

              handleResult(instance, value, resolve, reject);
            }, (reason) => {
              if (called) {
                return;
              }

              called = true;

              reject(reason);
            });
          } else {
            resolve(result);
          }
        } catch (error) {
          if (called) {
            return;
          }

          called = true;

          reject(error);
        }
      } else {
        resolve(result);
      }
    }

    const instance = new this.constructor((resolve, reject) => {
      const handle = callback => {
        setTimeout(() => {
          try {
            const result = callback(this.#result);

            handleResult(instance, result, resolve, reject);
          } catch(error) {
            reject(error);
          }
        });
      };

      if (this.#status === this.#PENDING) {
        this.#callbacks.push({
          onFulfilled: () => handle(onFulfilled),
          onRejected: () => handle(onRejected),
        });
      }

      if (this.#status === this.#FULFILLED) {
        handle(onFulfilled);
      }

      if (this.#status === this.#REJECTED) {
        handle(onRejected);
      }
    });

    return instance;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    return this.then(value => {
      return this.constructor.resolve(onFinally()).then(() => value);
    }, reason => {
      return this.constructor.resolve(onFinally()).then(() => { throw reason });
    });
  }

  static resolve(value) {
    if (value?.constructor === this) {
      return value;
    }

    return new this(resolve => resolve(value));
  }

  static reject(reason) {
    return new this((resolve, reject) => reject(reason));
  }

  static #iterableToArray(iterable) {
    if (typeof iterable[Symbol.iterator] !== this.#FUNCTION) {
      throw new TypeError(`${typeof iterable} is not iterable (cannot read property Symbol(Symbol.iterator))`);
    }

    return Array.from(iterable);
  }

  static all(iterable) {
    const promises = this.#iterableToArray(iterable);
    const values = [];

    let length = promises.length;

    return new this((resolve, reject) => {
      if (length === 0) {
        resolve(values);
      }

      promises.forEach((promise, index) => {
        this.resolve(promise).then(value => {
          values[index] = value;

          length -= 1;

          if (length === 0) {
            resolve(values);
          }
        }, reject);
      });
    });
  }

  static allSettled(iterable) {
    const promises = this.#iterableToArray(iterable);
    const results = [];

    let length = promises.length;

    return new this(resolve => {
      if (length === 0) {
        resolve(results);
      }

      promises.forEach((promise, index) => {
        this.resolve(promise).then(value => {
          results[index] = { status: this.#FULFILLED, value };

          length -= 1;

          if (length === 0) {
            resolve(results);
          }
        }, reason => {
          results[index] = { status: this.#REJECTED, reason };

          length -= 1;

          if (length === 0) {
            resolve(results);
          }
        });
      });
    });
  }

  static race(iterable) {
    const promises = this.#iterableToArray(iterable);

    return new this((resolve, reject) => {
      promises.forEach(promise => this.resolve(promise).then(resolve, reject));
    });
  }

  static any(iterable) {
    const promises = this.#iterableToArray(iterable);
    const reasons = [];

    let length = promises.length;

    return new this((resolve, reject) => {
      if (length === 0) {
        reject(new AggregateError(reasons, 'All promises were rejected'));
      }

      promises.forEach((promise, index) => {
        this.resolve(promise).then(resolve, reason => {
          reasons[index] = reason;

          length -= 1;

          if (length === 0) {
            reject(new AggregateError(reasons, 'All promises were rejected'));
          }
        });
      });
    });
  }
}

Promise.defer = Promise.deferred = function () {
  let result = {};

  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });

  return result;
};

console.log('Promise.resolve(): ', Promise.resolve());
console.log('Promise.resolve(): ', new Promise((a, b) => {a(56)}));

module.exports = Promise;

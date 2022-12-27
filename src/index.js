const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class Promise {
  #status;
  #value;
  #reason;
  #callbacks;

  #resolve(value) {
    if (this.#status === 'pending') {
      this.#status = 'fulfilled';
      this.#value = value;
    }
  }

  #reject(reason) {
    if (this.#status === 'pending') {
      this.#status = 'rejected';
      this.#reason = reason;
    }
  }

  constructor(executor) {
    if (!this instanceof this.constructor) {
      throw new TypeError('Promise constructor cannot be invoked without \'new\'');
    }

    if (typeof executor !== 'function') {
      throw TypeError(`Promise resolver ${executor} is not a function`);
    }

    this.#status = 'pending';
    this.#callbacks = [];

    try {
      executor(this.#resolve, this.#reject);
    } catch (error) {
      this.#reject(error);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

    return new this.constructor((resolve, reject) => {
      if (this.#status === 'pending') {
        this.#callbacks.push({ onFulfilled, onRejected });
      } else if (this.#status === 'fulfilled') {
        setTimeout(() => {
          try {
            const value = onFulfilled(this.#value);

            resolve(value);
          } catch(error) {
            reject(error);
          }
        });
      } else if (this.#status === 'rejected') {
        setTimeout(() => {
          try {
            const value = onRejected(this.#reason);

            resolve(value);
          } catch(error) {
            reject(error);
          }
        });
      }
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(onFinally) {
    this.then(value => {
      return this.constructor.resolve(onFinally()).then(() => value);
    }, reason => {
      return this.constructor.resolve(onFinally()).then(() => { throw reason });
    });
  }

  static resolve(value) {
    if (value.constructor === this) {
      return value;
    }

    return new this(resolve => resolve(value));
  }

  static reject(reason) {
    return new this((resolve, reject) => reject(reason));
  }

  static #iterableToArray(iterable) {
    if (typeof iterable[Symbol.iterator] !== 'function') {
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
          results[index] = { status: 'fulfilled', value };

          length -= 1;

          if (length === 0) {
            resolve(results);
          }
        }, reason => {
          results[index] = { status: 'rejected', reason };

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

import { PENDING, FULFILLED, REJECTED } from './constants.mjs';
import { iterableToArray, isThenableObject } from './utils.mjs';

/**
 * 模拟 Promise 函数.
 */
class MyPromise {
  #static; // 声明状态值.
  #value;  // 声明成功结果值.
  #reason; // 声明异常原因值.
  #callbacks = [];// 初始化待执行then的回调集.

  /**
   * .
   */
  constructor(executor) {
    if (!this instanceof this.constructor) {
      throw new TypeError('Promise constructor cannot be invoked without \'new\'');
    }

    if (typeof executor !== 'function') {
      throw new TypeError(`Promise resolver ${executor} is not a function`);
    }

    this.#static = PENDING; // 初始化状态值.

    const resolve = (value) => {
      if (this.#static === PENDING) {
        this.#static = FULFILLED;
        this.#value = value;
        this.#callbacks.forEach(({ onFulfilled }) => onFulfilled());
        this.#callbacks = [];
      }
    };
    const reject = (reason) => {
      if (this.#static === PENDING) {
        this.#static = REJECTED;
        this.#reason = reason;
        this.#callbacks.forEach(({ onRejected }) => onRejected());
        this.#callbacks = [];
      }
    };

    try {
      executor(resolve, reject); // 运行执行函数.
    } catch (error) {
      reject(error);
    }
  }

  #handler(callback, resolve, reject) {
    setTimeout(() => {
      try {
        callback()
      } catch (error) {

      }
    });
  }

  /**
   * Promise唯一的核心方法.
   */
  then(onFulfilled, onRejected) {
    if (typeof onFulfilled !== 'function') {
      onFulfilled = value => value;
    }
    if (typeof onRejected !== 'function') {
      onRejected = reason => { throw reason };
    }

    return new this.constructor((resolve, reject) => {
      if (this.#static === PENDING) {
        this.#callbacks.push({
          onFulfilled() {
            setTimeout(() => onFulfilled(this.#value))
          },
          onRejected() {
            setTimeout(() => onRejected(this.#reason))
          },
        });
      } else if (this.#static === FULFILLED) {
        this.#handler(() => onFulfilled(this.#value), resolve, reject);

        setTimeout(() => onFulfilled(this.#value));
      } else if (this.#static === REJECTED) {
        setTimeout(() => onRejected(this.#reason));
      }
    });
  }

  /**
   * .
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }

  /**
   * .
   */
  finally(onFinally) {
    this.then(value => {
      return this.constructor.resolve(onFinally()).then(() => value);
    }, reason => {
      return this.constructor.resolve(onFinally()).then(() => { throw reason });
    });
  }

  /**
   * .
   */
  static resolve(value) {
    if (value instanceof this) {
      return value;
    }

    return new this((resolve, reject) => {
      resolve(value);
    });
  }

  /**
   * .
   */
  static reject(reason) {
    return new this((resolve, reject) => {
      reject(reason);
    });
  }

  /**
   * .
   */
  static all(iterable) {
    const promises = iterableToArray(iterable);

    return new this((resolve, reject) => {
      const values = new Array(promises.length);
      // 遍历promises依次执行，将resolve结果依次加入values；若其中有一个reject，则直接返回此reason.
      promises.forEach(promise => {
        this.resolve(promise).then(value => values.push(value), reject);
      });
      // 若promises为空，会跳过遍历直接返回空数组；否则表示全部resolve，返回结果集数组values.
      resolve(values);
    });
  }

  /**
   * .
   */
  static allSettled(iterable) {
    const promises = iterableToArray(iterable);

    return new this((resolve, reject) => {
      const results = new Array(promises.length);

      promises.forEach(promise => {
        this.resolve(promise).then(value => results.push({ status: FULFILLED, value }), reason => results.push({ status: REJECTED, reason }));
      });

      resolve(results);
    });
  }

  /**
   * .
   */
  static race(iterable) {
    const promises = iterableToArray(iterable);

    return new this((resolve, reject) => {
      promises.forEach(promise => {
        this.resolve(promise).then(resolve, reject);
      });
    });
  }

  /**
   * .
   */
  static any(iterable) {
    const promises = iterableToArray(iterable);

    return new this((resolve, reject) => {
      const reasons = new Array(promises.length);

      promises.forEach(promise => {
        this.resolve(promise).then(resolve, reason => reasons.push(reason));
      });

      reject(new AggregateError(reasons, 'All promises were rejected'));
    });
  }
}

export default MyPromise;

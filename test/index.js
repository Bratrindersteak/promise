const Promise = require('../src');

Promise.defer = Promise.deferred = function () {
    let result = {};

    result.promise = new Promise((resolve, reject) => {
        result.resolve = resolve;
        result.reject = reject;
    });

    return result;
};

module.exports = Promise;

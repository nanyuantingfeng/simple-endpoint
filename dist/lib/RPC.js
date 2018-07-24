'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var PROTOCOL = 'simple-rpc';
var isArray = function (o) {
    return Array.isArray(o);
};
var isFunction = function (o) {
    return 'function' === typeof o;
};
var has = function (o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
};
function Defer() {
    var resolve;
    var reject;
    var promise = new Promise(function (a, b) {
        resolve = a;
        reject = b;
    });
    return { promise: promise, resolve: resolve, reject: reject };
}
function noop(data) {}
function builtOrigin(origin) {
    if (origin === '*') {
        return '*';
    }
    if (origin) {
        var uorigin = new URL(origin);
        return uorigin.protocol + '//' + uorigin.host;
    }
    return origin;
}
var RPC = function () {
    function RPC(source, target, origin, methods) {
        var _this = this;
        this.onMessage = function (event) {
            if (_this._$isDestroyed) {
                return;
            }
            if (_this.origin !== '*' && event.origin !== _this.origin) {
                return;
            }
            if (!event.data || typeof event.data !== 'object') {
                return;
            }
            if (event.data.protocol !== PROTOCOL) {
                return;
            }
            if (!isArray(event.data.arguments)) {
                return;
            }
            _this.handle(event.data);
        };
        this.source = source;
        this.target = target;
        this.origin = builtOrigin(origin);
        this._$sequence = 0;
        this._$callbacks = {};
        this._$methods = (isFunction(methods) ? methods(this) : methods) || {};
        this.initialize();
    }
    RPC.prototype.initialize = function () {
        this.source.addEventListener('message', this.onMessage, false);
    };
    RPC.prototype.send = function (msg) {
        this.target.postMessage(msg, this.origin);
    };
    RPC.prototype.destroy = function () {
        this._$isDestroyed = true;
        this.source.removeEventListener('message', this.onMessage, false);
    };
    RPC.prototype.invoke = function (method) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var defer = Defer();
        if (this._$isDestroyed) {
            return defer.resolve();
        }
        var seq = this._$sequence++;
        this._$callbacks[seq] = defer.resolve;
        this.send({
            protocol: PROTOCOL,
            sequence: seq,
            method: method,
            arguments: args
        });
        return defer.promise;
    };
    RPC.prototype.handle = function (msg) {
        if (this._$isDestroyed) {
            return;
        }
        if (has(msg, 'method')) {
            return this.__handleMethod(msg);
        }
        if (has(msg, 'response')) {
            return this.__handleResponse(msg);
        }
    };
    RPC.prototype.__handleMethod = function (msg) {
        if (!has(this._$methods, msg.method)) {
            return;
        }
        var dd = this._$methods[msg.method].apply(this._$methods, msg.arguments);
        this.send({
            protocol: PROTOCOL,
            response: msg.sequence,
            arguments: [dd]
        });
    };
    RPC.prototype.__handleResponse = function (msg) {
        var cb = this._$callbacks[msg.response];
        delete this._$callbacks[msg.response];
        if (isFunction(cb)) {
            cb.apply(void 0, msg.arguments);
        }
    };
    return RPC;
}();
exports.default = RPC;
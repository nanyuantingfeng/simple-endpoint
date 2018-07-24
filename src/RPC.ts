/******************************************************
 * Created by nanyuantingfeng on 2018/7/23 14:43.
 *****************************************************/

const PROTOCOL = 'simple-rpc';
const isArray = (o) => Array.isArray(o);
const isFunction = (o) => 'function' === typeof o;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function Defer () {
  let resolve;
  let reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });

  return {promise, resolve, reject};
}

function noop (data: any): void {

}

function builtOrigin (origin: string): string {

  if (origin === '*') {
    return '*';
  }

  if (origin) {
    const uorigin = new URL(origin);
    return uorigin.protocol + '//' + uorigin.host;
  }

  return origin;
}

export interface IFrameLike {
  addEventListener: (name: string, callback: (event?: any) => void, capture?: boolean) => void;
  removeEventListener?: (name: string, callback: (event?: any) => void, capture?: boolean) => void;
  postMessage?: (msg: any, orgin?: string) => void;
  origin?: string;

  [others: string]: any;
}

interface IMsg {
  protocol: string;
  arguments: any[];

  method?: string;
  sequence?: number;
  response?: any;
}

interface IEvent {
  origin?: string;
  data?: IMsg;
}

export default class RPC {

  source: IFrameLike;
  target: IFrameLike;
  origin: string;

  _$isDestroyed: boolean;
  _$sequence: number;
  _$callbacks: object;
  _$methods: object;

  constructor (source: IFrameLike, target: IFrameLike, origin: string, methods?: any) {
    this.source = source;
    this.target = target;

    this.origin = builtOrigin(origin);
    this._$sequence = 0;
    this._$callbacks = {};

    this._$methods = (isFunction(methods) ? methods(this) : methods) || {};
    this.initialize();
  }

  initialize () {
    this.source.addEventListener('message', this.onMessage, false);
  }

  send (msg: IMsg) {
    this.target.postMessage(msg, this.origin);
  }

  destroy () {
    this._$isDestroyed = true;
    this.source.removeEventListener('message', this.onMessage, false);
  }

  protected onMessage = (event: IEvent) => {

    if (this._$isDestroyed) {
      return;
    }

    if (this.origin !== '*' && event.origin !== this.origin) {
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

    this.handle(event.data);
  }

  invoke (method, ...args): Promise<any> {
    const defer = Defer();

    if (this._$isDestroyed) {
      return defer.resolve();
    }

    const seq = this._$sequence++;

    this._$callbacks[seq] = defer.resolve;

    this.send({
      protocol: PROTOCOL,
      sequence: seq,
      method: method,
      arguments: args,
    });

    return defer.promise;
  }

  handle (msg: IMsg) {
    if (this._$isDestroyed) {
      return;
    }

    if (has(msg, 'method')) {
      return this.__handleMethod(msg);
    }

    if (has(msg, 'response')) {
      return this.__handleResponse(msg);
    }
  }

  private __handleMethod (msg: IMsg) {
    if (!has(this._$methods, msg.method)) {
      return;
    }

    const dd = this._$methods[msg.method].apply(this._$methods, msg.arguments);

    this.send({
      protocol: PROTOCOL,
      response: msg.sequence,
      arguments: [dd],
    });
  }

  private __handleResponse (msg: IMsg) {
    const cb = this._$callbacks[msg.response];
    delete this._$callbacks[msg.response];

    if (isFunction(cb)) {
      cb(...msg.arguments);
    }
  }
}

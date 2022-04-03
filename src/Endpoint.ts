/***************************************************
 * Created by nanyuantingfeng on 2020/6/9 12:29. *
 ***************************************************/
type PromiseType<T> = T extends Promise<infer R> ? R : T
type MessageEventDataType = {
  callback_id?: string
  method?: string
  endpoint_version?: string
  params?: any[]
  error?: any
  result?: any
}

type DefaultHandlerType = (e: MessageEvent) => Promise<any> | never

type EndpointOptionsType =
  | string
  | DefaultHandlerType
  | {
      connectId?: string
      defaultHandler?: DefaultHandlerType
    }

const ENDPOINT_VERSION = `1.3.0`
const INITIALIZE_MESSAGE = `$$$SIMPLE_ENDPOINT_INITIALIZE_CONNECT$_$X$`
const NOT_IFRAME_ID = `Endpoint.connect(dist0,dist1) if dist0 or dist1 is string, it is must be a iframe id.`
const NOT_MATCH_VERSION = `Two Endpoint instances of inconsistent version have been found. Please note the upgrade`
const ENDPOINT_INVOKE_TIMEOUT = -1

let __COUNT__ = -1

function createCallbackId() {
  return `ENDPOINT_CALLBACK_ID__${++__COUNT__}`
}

function getValueByPath(source: any, path: string, defaultV?: any) {
  const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let oo = source

  let i = -1
  while (++i < paths.length) {
    const p = paths[i]
    oo = Object(oo)[p]
    if (oo === undefined) return defaultV
  }
  return oo
}

function Deffer<T>(timeout?: number) {
  let resolve: (value?: T | PromiseLike<T>) => void = undefined
  let reject: (reason?: any) => void = undefined
  let promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  if (timeout > 0) {
    setTimeout(() => reject(ENDPOINT_INVOKE_TIMEOUT), timeout)
  }

  return { promise, resolve, reject }
}

function elementOnReady(element: HTMLIFrameElement | Window): Promise<Window> {
  const deffer = Deffer<Window>()

  try {
    if ((element as HTMLIFrameElement).tagName.toUpperCase() === 'IFRAME') {
      element.addEventListener('load', () => deffer.resolve((element as HTMLIFrameElement).contentWindow))
      return deffer.promise
    }

    const _window = element as Window

    if (_window.window && _window.window === _window) {
      if (_window.document && _window.document.readyState === 'complete') {
        setTimeout(() => deffer.resolve(_window), 16)
        return deffer.promise
      }
      element.addEventListener('load', () => deffer.resolve(_window))
    }
  } catch (e) {
    // at use `window.parent` call this function, will throw error.

    // Uncaught (in promise) DOMException: Blocked a frame with origin
    // "xxxxxx"
    // from accessing a cross-origin frame.

    setTimeout(() => deffer.resolve(element as Window), 16)
  }

  return deffer.promise
}

function makeInitializeMessage(connectId: string = '$X$') {
  return INITIALIZE_MESSAGE.replace('$X$', connectId)
}

function defaultMessageEventHandler(e: MessageEvent): never {
  throw new Error(`handler not found for method '${e.data.method}'`)
}

function handshakeEventHandler(message: string) {
  return `receipt(${message})`
}

export class Endpoint<T extends { [key: string]: (...args: any) => any }> {
  static connect: (
    dist0: string | HTMLIFrameElement | Window,
    dist1?: string | HTMLIFrameElement | Window,
    connectId?: string
  ) => PromiseLike<[Window, Window]>

  private __target: MessagePort
  private __dispatches: any = {}
  private readonly __initialize_message: string
  private readonly __default_handler: DefaultHandlerType
  private readonly __connectId: string

  constructor(private readonly handlers?: Record<string, any>, options?: EndpointOptionsType) {
    if (!this.handlers || typeof this.handlers !== 'object') {
      this.handlers = {}
    }

    if (typeof options === 'undefined') {
      options = {}
    }

    if (typeof options === 'string') {
      options = { connectId: options }
    }

    if (typeof options === 'function') {
      options = { defaultHandler: options }
    }

    const { connectId, defaultHandler = defaultMessageEventHandler } = options

    this.__connectId = connectId
    this.__initialize_message = makeInitializeMessage(connectId)
    this.__default_handler = defaultHandler
  }

  private readonly __message_handler = (e: MessageEvent) => {
    if (e.data === this.__initialize_message && e.ports && e.ports[0]) {
      // `Endpoint.connect` maybe called multiple times
      //  or called it on main/iframe page at the same time
      this.destroy()
      this.__target = e.ports[0]
      this.__target.onmessage = this.__target_handler
    }
    // other message will be ignored
  }

  private readonly __target_handler = (e: MessageEvent) => {
    const data: MessageEventDataType = e.data

    if (typeof data === 'object' && data.endpoint_version) {
      if (data.endpoint_version !== ENDPOINT_VERSION) {
        console.warn(NOT_MATCH_VERSION)
      }

      if (data.callback_id && 'result' in data) {
        return this.__handle_callback(e)
      }

      if ('method' in data && !('result' in data)) {
        return this.__handle_invoke(e)
      }
    }
  }

  private readonly __handle_invoke = (e: MessageEvent) => {
    const data: MessageEventDataType = e.data
    let fn: Function, R: PromiseLike<any>
    if (data.method === '___$handle_shake$___') {
      fn = handshakeEventHandler
    } else {
      fn = getValueByPath(this.handlers, data.method, this.__default_handler)
    }

    R = Promise.resolve(fn.apply(this.handlers, data.params || []))

    if (!data.callback_id) {
      return
    }

    R.then(
      (result) => ({ result }),
      (error) => ({
        error: {
          code: -1,
          message: error.message || error.code || error.name
        }
      })
    )
      .then((response) => ({
        endpoint_version: ENDPOINT_VERSION,
        callback_id: e.data.callback_id,
        ...response
      }))
      .then((response) => this.__target.postMessage(response))
  }

  private readonly __handle_callback = (e: MessageEvent) => {
    const data: MessageEventDataType = e.data

    const deffer = this.__dispatches[data.callback_id]
    delete this.__dispatches[data.callback_id]

    if (deffer && deffer.resolve && deffer.reject) {
      data.error ? deffer.reject(data.error) : deffer.resolve(data.result)
    }
  }

  listen() {
    this.unlisten()
    window.addEventListener('message', this.__message_handler)
    return this
  }

  unlisten() {
    window.removeEventListener('message', this.__message_handler)
    return this
  }

  destroy() {
    if (this.__target && this.__target.close) {
      this.__target.close()
    }
    return this
  }

  handshake(timeout: number = 100) {
    const _hs_message = String(Math.random())
    let _receipt_message: string = undefined
    // @ts-ignore
    this.invoke('___$handle_shake$___', _hs_message).then((data) => (_receipt_message = data))

    const deffer = Deffer<void>()
    setTimeout(() => (_receipt_message === `receipt(${_hs_message})` ? deffer.resolve() : deffer.reject()), timeout)
    return deffer.promise
  }

  connect(dist: string | HTMLIFrameElement | Window = window) {
    return Endpoint.connect(window, dist, this.__connectId).then(([_, R]) => R)
  }

  invoke<K extends keyof T>(method: K, ...params: Parameters<T[K]>): Promise<PromiseType<ReturnType<T[K]>>> {
    return this.apply(method, params, -1)
  }

  apply<K extends keyof T>(
    method: K,
    params: Parameters<T[K]>,
    timeout: number
  ): Promise<PromiseType<ReturnType<T[K]>>> {
    const callback_id = createCallbackId()
    const deffer = Deffer<PromiseType<ReturnType<T[K]>>>(timeout)

    this.__dispatches[callback_id] = deffer

    try {
      this.__target.postMessage({ endpoint_version: ENDPOINT_VERSION, callback_id, method, params })
    } catch (e) {
      delete this.__dispatches[callback_id]
      deffer.reject(e)
    }

    return deffer.promise
  }
}

Endpoint.connect = (
  dist0: string | HTMLIFrameElement | Window = window,
  dist1: string | HTMLIFrameElement | Window = window,
  connectId?: string
): PromiseLike<[Window, Window]> => {
  if (typeof dist0 === 'string') {
    dist0 = document.getElementById(dist0) as HTMLIFrameElement
    if (!dist0) throw new Error(NOT_IFRAME_ID)
  }
  if (typeof dist1 === 'string') {
    dist1 = document.getElementById(dist1) as HTMLIFrameElement
    if (!dist1) throw new Error(NOT_IFRAME_ID)
  }

  const channel = new MessageChannel()
  const message = makeInitializeMessage(connectId)

  return Promise.all([
    elementOnReady(dist0).then((_window) => (_window.postMessage(message, '*', [channel.port1]), _window)),
    elementOnReady(dist1).then((_window) => (_window.postMessage(message, '*', [channel.port2]), _window))
  ])
}

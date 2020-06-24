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

const ENDPOINT_VERSION = `1.1.0`
const INITIALIZE_MESSAGE = `$$$SIMPLE_ENDPOINT_INITIALIZE_CONNECT$_$X$`
const NOT_IFRAME_ID = `Endpoint.connect(dist0,dist1) if dist0 or dist1 is string, it is must be a iframe id.`
const NOT_MATCH_VERSION = `Two Endpoint instances of inconsistent version have been found. Please note the upgrade`

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

function elementOnReady(element: HTMLIFrameElement | Window, fn: (win: Window) => void) {
  try {
    if ((element as HTMLIFrameElement).tagName.toUpperCase() === 'IFRAME') {
      element.addEventListener('load', () => fn((element as HTMLIFrameElement).contentWindow))
      return
    }

    const _window = element as Window

    if (_window.window && _window.window === _window) {
      if (_window.document && _window.document.readyState === 'complete') {
        fn(_window)
        return
      }
      element.addEventListener('load', () => fn(_window))
    }
  } catch (e) {
    // at use `window.parent` call this function, will throw error.

    // Uncaught (in promise) DOMException: Blocked a frame with origin
    // "xxxxxx"
    // from accessing a cross-origin frame.

    fn(element as Window)
  }
}

function makeInitializeMessage(connectId: string = '$X$') {
  return INITIALIZE_MESSAGE.replace('$X$', connectId)
}

function defaultMessageEventHandler(e: MessageEvent): never {
  throw new Error(`handler not found for method '${e.data.method}'`)
}

export default class Endpoint<T extends { [key: string]: (...args: any) => any }> {
  static connect: (
    dist0: string | HTMLIFrameElement | Window,
    dist1?: string | HTMLIFrameElement | Window,
    connectId?: string
  ) => void

  private __target: MessagePort
  private __dispatches: any = {}
  private readonly __initialize_message: string
  private readonly __default_handler: DefaultHandlerType
  private readonly __connectId: string

  constructor(private readonly handlers?: Record<string, any>, options?: EndpointOptionsType) {
    if (!this.handlers || typeof this.handlers !== 'object') {
      this.handlers = {}
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

  private readonly __handler = (e: MessageEvent) => {
    if (e.data === this.__initialize_message && e.ports && e.ports[0]) {
      // `Endpoint.connect` maybe called multiple times
      //  or called it on main/iframe page at the same time
      this.destroy()
      this.__target = e.ports[0]
      this.__target.onmessage = (e) => {
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
      return
    }
    // other message will be ignored
  }

  private readonly __handle_invoke = (e: MessageEvent) => {
    const data: MessageEventDataType = e.data
    const fn: Function = getValueByPath(this.handlers, data.method, this.__default_handler)
    const R = Promise.resolve(fn.apply(this.handlers, data.params || []))

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

    const dispatch = this.__dispatches[data.callback_id]
    delete this.__dispatches[data.callback_id]

    if (dispatch && dispatch.resolve && dispatch.reject) {
      data.error ? dispatch.reject(data.error) : dispatch.resolve(data.result)
    }
  }

  listen() {
    this.unlisten()
    window.addEventListener('message', this.__handler)
    return this
  }

  unlisten() {
    window.removeEventListener('message', this.__handler)
    return this
  }

  destroy() {
    if (this.__target && this.__target.close) {
      this.__target.close()
    }
    return this
  }

  connect(dist: string | HTMLIFrameElement | Window = window) {
    Endpoint.connect(window, dist, this.__connectId)
    return this
  }

  invoke<K extends keyof T>(method: K, ...params: Parameters<T[K]>): Promise<PromiseType<ReturnType<T[K]>>> {
    const callback_id = createCallbackId()

    return new Promise((resolve, reject) => {
      this.__dispatches[callback_id] = { resolve, reject }

      try {
        const message = { endpoint_version: ENDPOINT_VERSION, callback_id, method, params }
        this.__target.postMessage(message)
      } catch (e) {
        delete this.__dispatches[callback_id]
        reject(e)
      }
    })
  }
}

Endpoint.connect = (
  dist0: string | HTMLIFrameElement | Window = window,
  dist1: string | HTMLIFrameElement | Window = window,
  connectId?: string
) => {
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
  elementOnReady(dist0, (_window) => _window.postMessage(message, '*', [channel.port1]))
  elementOnReady(dist1, (_window) => _window.postMessage(message, '*', [channel.port2]))
}

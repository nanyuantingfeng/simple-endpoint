/***************************************************
 * Created by nanyuantingfeng on 2020/6/9 12:29. *
 ***************************************************/
type PromiseType<T> = T extends Promise<infer R> ? R : T
type MessageEventData = {
  callback_id?: string
  method?: string
  endpoint_version?: string
  params?: any[]
  error?: any
  result?: any
}

const ENDPOINT_VERSION = '1.0.0'
const INITIALIZE_MESSAGE = '$$$SIMPLE_RPC_INITIALIZE_CONNECT$_$X$'
const NOT_IFRAME_ID = `Endpoint.connect(dist0,dist1) if dist0 or dist1 is string, it is must be a iframe id.`
const NOT_MATCH_VERSION = `Two Endpoint instances of inconsistent version have been found. Please note the upgrade`

let __COUNT__ = -1

function createId() {
  return `ENDPOINT_CALLBACK_ID__${++__COUNT__}`
}

function getByPath(source: any, path: string, defaultV: any = undefined) {
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

function elementOnrReady(element: HTMLIFrameElement | Window, fn: (win: Window) => void) {
  try {
    if ((element as HTMLIFrameElement).tagName === 'IFRAME') {
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

export class Endpoint<T extends { [key: string]: (...args: any) => any }> {
  static connect: (dist0: string | HTMLIFrameElement | Window, dist1?: string | HTMLIFrameElement | Window) => void

  private target: MessagePort
  private dispatches: any = {}

  constructor(
    private readonly handlers?: Record<string, any>,
    private readonly defaultHandler?: (e: MessageEvent) => Promise<T> | never
  ) {
    if (!this.handlers || typeof this.handlers !== 'object') {
      this.handlers = {}
    }

    if (!defaultHandler) {
      this.defaultHandler = (e: MessageEvent): never => {
        throw new Error(`No handler be found for method '${e.data.method}'`)
      }
    }
  }

  private readonly __handler__ = (e: MessageEvent) => {
    if (e.data === INITIALIZE_MESSAGE && e.ports && e.ports[0]) {
      // `Endpoint.connect` maybe called multiple times
      //  or called it on main/iframe page at the same time
      this.destroy()
      this.target = e.ports[0]
      this.target.onmessage = (e) => {
        const data: MessageEventData = e.data

        if (typeof data === 'object' && data.endpoint_version) {
          if (data.endpoint_version !== ENDPOINT_VERSION) {
            console.warn(NOT_MATCH_VERSION)
          }

          if (data.callback_id && 'result' in data) {
            return this.handleCallback(e)
          }

          if ('method' in data && !('result' in data)) {
            return this.handleInvoke(e)
          }
        }
      }
      return
    }
    // other message will be ignored
  }
  private handleInvoke = (e: MessageEvent) => {
    const data: MessageEventData = e.data
    const fn: Function = getByPath(this.handlers, data.method, this.defaultHandler)
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
      .then((response) => this.target.postMessage(response))
  }
  private handleCallback = (e: MessageEvent) => {
    const data: MessageEventData = e.data

    const dispatch = this.dispatches[data.callback_id]
    delete this.dispatches[data.callback_id]

    if (dispatch && dispatch.resolve && dispatch.reject) {
      data.error ? dispatch.reject(data.error) : dispatch.resolve(data.result)
    }
  }

  listen() {
    this.unlisten()
    window.addEventListener('message', this.__handler__)
    return this
  }

  unlisten() {
    window.removeEventListener('message', this.__handler__)
    return this
  }

  destroy() {
    if (this.target && this.target.close) {
      this.target.close()
    }
  }

  invoke<K extends keyof T>(method: K, ...params: Parameters<T[K]>): Promise<PromiseType<ReturnType<T[K]>>> {
    const callback_id = createId()

    return new Promise((resolve, reject) => {
      this.dispatches[callback_id] = { resolve, reject }

      try {
        const message = { endpoint_version: ENDPOINT_VERSION, callback_id, method, params }
        this.target.postMessage(message)
      } catch (e) {
        delete this.dispatches[callback_id]
        reject(e)
      }
    })
  }
}

Endpoint.connect = (
  dist0: string | HTMLIFrameElement | Window = window,
  dist1: string | HTMLIFrameElement | Window = window
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
  elementOnrReady(dist0, (_window) => _window.postMessage(INITIALIZE_MESSAGE, '*', [channel.port1]))
  elementOnrReady(dist1, (_window) => _window.postMessage(INITIALIZE_MESSAGE, '*', [channel.port2]))
}

export default Endpoint

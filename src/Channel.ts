/***************************************************
 * Created by gongyanyu on 2021/8/27 11:17. *
 ***************************************************/
const EVENT_PREFIX = '[[__SIMPLE_CHANNEL__]]'

class Event {
  events: Record<string, Function[]> = {}

  toBeNotify: Array<{
    eventName: string
    data: any[]
    scope: any
  }> = []

  _scope: any = null

  notify(eventName: string, ...rest: any[]): this {
    const eventList = this.events[eventName]
    let i = 0
    if (eventList) {
      const len = eventList.length
      for (; i < len; i += 1) {
        eventList[i].apply(this._scope || this, rest)
      }
    } else {
      this.toBeNotify.push({ eventName, data: rest, scope: this })
    }

    if (eventName.startsWith(EVENT_PREFIX)) {
      this.unsubscribe(eventName, null)
    }
    return this
  }

  has(eventName: string): boolean {
    return !!(this.events[eventName] && this.events[eventName].length > 0)
  }

  notifyWith(eventName: string, scope: any, ...rest: any[]): void {
    if (arguments.length < 2) {
      throw new TypeError('arguments error')
    }
    this._scope = scope
    this.notify(eventName, ...rest)
    this._scope = null
  }

  subscribe(eventName: string, callback: Function | Function[]): this {
    let i = 0
    const len = this.toBeNotify.length
    if (arguments.length < 2) {
      throw new TypeError('arguments error ')
    }

    let eventList = this.events[eventName] ? this.events[eventName] : (this.events[eventName] = [])
    if (Object.prototype.toString.call(callback) === '[object Array]') {
      eventList = eventList.concat(callback)
    } else {
      eventList.push(callback as Function)
    }
    this.events[eventName] = eventList
    for (; i < len; i += 1) {
      if (this.toBeNotify[i].eventName === eventName) {
        this.notify.apply(this.toBeNotify[i].scope, [eventName, ...this.toBeNotify[i].data])
        this.toBeNotify.splice(i, 1)
        break
      }
    }
    return this
  }

  unsubscribe(eventName: string, callback?: Function): this {
    if (callback) {
      const callbacks = this.events[eventName]
      for (let i = 0; i < callbacks.length; i += 1) {
        if (callbacks[i] === callback) {
          callbacks.splice((i -= 1), 1)
        }
      }
    } else {
      delete this.events[eventName]
    }
    return this
  }

  guid(): string {
    return 'xxxxxxxx_xxxx_4xxx_yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  clear(): void {
    this.events = {}
    this.toBeNotify = []
  }
}

export interface IChannelMessage<T = any> {
  api: string
  data: T
  error?: Error
  eventId: string
}

export interface IChannelOptions {
  sender: (message: IChannelMessage) => void
  receiver: (handler: (message: IChannelMessage) => void) => void
  serializeError?: boolean
}

type Awaited<T> = T extends PromiseLike<infer R> ? Awaited<R> : T

const serializeObject = (obj: any): any => JSON.parse(JSON.stringify(obj, Object.getOwnPropertyNames(obj)))

export class Channel<T extends Record<string, (...args: any) => any>> {
  public event: Event
  public id: string
  public serializeError: boolean = false

  public options = {
    sender: (message: any) => message,
    receiver: (callback: any) => callback(null)
  }

  constructor(option: IChannelOptions, id?: string) {
    this.id = id ?? '?'
    this.event = new Event()
    this.__initialize(option)
  }

  private __initialize(option: IChannelOptions): void {
    if (!option.sender || !option.receiver) throw new Error('Please provide sender and receiver')
    this.options.sender = option.sender
    if (option.hasOwnProperty('serializeError')) {
      this.serializeError = option.serializeError
    }
    option.receiver((message) => {
      if (this.event.has(message.eventId)) {
        this.event.notify(message.eventId, message)
      } else if (this.event.has(message.api)) {
        this.event.notify(message.api, message)
      } else {
        const _error = new Error(`can not find api ${message.api}`)
        const error = this.serializeError ? serializeObject(_error) : _error
        this.options.sender({ ...message, error })
      }
    })
  }

  async call<K extends keyof T, R = Awaited<ReturnType<T[K]>>>(api: K, ...data: Parameters<T[K]>): Promise<R> {
    return this.apply(api, data)
  }

  async apply<K extends keyof T, R = Awaited<ReturnType<T[K]>>>(api: K, data: Parameters<T[K]>): Promise<R> {
    return await new Promise<R>((resolve, reject) => {
      this.__do_call(api, data, (message: IChannelMessage<Parameters<T[K]>>) => {
        message.error ? reject(message.error) : resolve(message.data)
      })
    })
  }

  private __do_call<K extends keyof T>(api: K, data: Parameters<T[K]>, callback: Function): void {
    const eventId = `${EVENT_PREFIX}_[${this.id}]_${this.event.guid()}`
    this.event.subscribe(eventId, callback)
    this.options.sender({ api, data, eventId: eventId })
  }

  on<K extends keyof T, R = Awaited<ReturnType<T[K]>>>(
    api: K,
    handler: (...data: Parameters<T[K]>) => R | Promise<R>
  ): this {
    this.event.subscribe(api as string, async (message: IChannelMessage<Parameters<T[K]>>) => {
      try {
        const data = await handler(...message.data)
        this.options.sender({ ...message, data })
      } catch (e) {
        const error = this.serializeError ? serializeObject(e) : e
        this.options.sender({ ...message, error })
      }
    })
    return this
  }

  un<K extends keyof T>(api: K): this {
    this.event.unsubscribe(api as string)
    return this
  }
}

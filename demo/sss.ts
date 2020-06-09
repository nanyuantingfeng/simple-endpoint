/***************************************************
 * Created by nanyuantingfeng on 2020/6/9 17:10. *
 ***************************************************/
import Endpoint from '../src/Endpoint'

type LLL = {
  getDate: (a: number, b: number) => Promise<number>
  getA: () => string
  getD: () => Promise<{ ddd: number }>
}

type PromiseType<T> = T extends Promise<infer R> ? R : T
type RegisterHandlers = { [key: string]: (...args: any) => any }
type ToAsync<T extends RegisterHandlers> = {
  [K in keyof T]: (...args: Parameters<T[K]>) => Promise<PromiseType<ReturnType<T[K]>>>
}

type DDD = ToAsync<LLL>

const endpoint = new Endpoint<LLL>({
  aaaa() {}
})

endpoint.invoke('getDate', 1, 3).then((d) => {})
endpoint.invoke('getA').then((d) => {})
endpoint.invoke('getD').then((d) => {})

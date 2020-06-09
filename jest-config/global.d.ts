/***************************************************
 * Created by nanyuantingfeng on 2020/6/9 13:03. *
 ***************************************************/
import { Browser } from 'puppeteer'

declare namespace global {
  const __BROWSER__: Browser
}

declare var global: NodeJS.Global & {
  __BROWSER__: Browser
}

interface Window {
  __BROWSER__: Browser
}

declare const __BROWSER__: Browser

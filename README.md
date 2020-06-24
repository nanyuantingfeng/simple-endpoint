# simple-endpoint

> 在iframe之间相互调用函数的小工具库, 为 `main page`,`iframe page`,`nested iframe` 之间提供通信能力,调用函数的体验的接近于本地异步函数.



## 安装

```shell
npm install simple-endpoint
```



## 使用

```html
//ES5 
const Endpoint = require('simple-endpoint');

//ES6
import Endpoint from 'simple-endpoint'

//Browser
<script src="......./simple-endpoint/dist/Endpoint.umd.js"></script>


```





## 示例

// iframe.js

``` js

const endpoint = new Endpoint({
    doY (n,y) {
       return n * 12 / y;
    }
}, e => {
  // when other iframe call this endpoint function,
  // and this fucntion is not registered at endpoint.
  // current calling will forwarding this here.
  
});

Endpoint.connect(window, window.parent)

endpoint.listen()

// call window.parent endpoint instance fucntion `doX`
endpoint.invoke("doX", 4,5,6).then(result => {
  
  // result ===  999 * 4 + 5 - 6
  
})

```



// main.js

``` js
 
const endpoint = new Endpoint({
  doX(a,b,c){
    return 999 * a + b - c
  }
});

// At iframe also can call Endpoint.connect, choose between them
// Endpoint.connect(window, document.getElementById("iframe0"))

// call iframe window endpoint instance function `beep`
endpoint.invoke('doY', 5, 8).then(result => {
  // result === 12 * 5 / 8
});

```



更多示例 :  [examples](https://github.com/nanyuantingfeng/simple-endpoint/tree/master/examples)

# API
0. `constructor(handlers, options)`

* handlers :  提供注册的服务列表
* options 
    *  connectId : string // 当前实例ID
    *  defaultHandler : Function // 默认handler, 在没有找到注册的方法时被调用.
   


1. `static connect(dist: string | HTMLIFrameElement | Window, dist1, connectId: string) `

   > 链接两个端点, 端点可以是 `window` 实例/iframe元素/iframe元素的id
   >
   > 此方法会向两个dist发送初始化事件,以及MessagePort

2. `listen()`

   > 监听来自当前window的消息. 此方法如果不调用,将不会响应来自其他页面的的函数调用.

3. `unlisten()`

   > 解除监听,与listen方法对应

4. `destroy()`

   > 摧毁用于通信的MessagePort, 与unlisten方法有很大不同, 使用的unlisten后再次调用listen,仍然可以监听并响应函数调用. 使用destroy后, 必须重新调用 connect 方法才能重新监听函数调用.

5. `connect(dist:string | HTMLIFrameElement | Window)`
   
   > static connect 方法的快捷方式


## 浏览器支持

1. 通信逻辑依赖 `MessageChannel API`,请参考 [caniuse MessageChannel](https://caniuse.com/#search=MessageChannel)

2. 异步逻辑由`Promise API`进行提供, 如果浏览器不支持,请提供 `polyfill`

   

## 说明

1. Endpoint.connect 函数应该在main中调用,还是iframe中调用?

   > 都可以, 但是还是建议在 iframe 中调用, 如果在 main page 中调用,请确保在调用 connect 之前保证 iframe page 中的Endpoint实例的已经初始化, 如果你不能保证 iframe 中Endpoint实例初始化在connect调用之前, 请在iframe page 中调用 connect.

2. Endpoint.connect 能在main和iframe中都调用吗?

   > 可以, 后一次执行connect时会调用实例的destroy方法, 所以无论调用多少次, 此方法都是安全的


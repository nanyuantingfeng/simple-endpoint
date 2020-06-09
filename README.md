# simple-endpoint

>  在iframe之间相互调用函数的库



## 安装

```shell
npm install simple-endpoint
```



## 使用



## 示例

从iframe中导出一个方法

// iframe.js

``` js
const Endpoint = require('simple-endpoint');
 

const endpoint = new Endpoint({
    beep (n) {
       return n * 12;
    }
});

Endpoint.connect(window, window.parent)

endpoint.listen()

endpoint.invoke("doX", 4).then(result => {
  
  // result ===  999 * 4
  
})

```



// main.js

``` js
const Endpoint = require('simple-endpoint');
 
const endpoint = new Endpoint({
  doX(a){
    return 999 * a
  }
});

// Endpoint.connect(window, document.getElementById("iframe0"))

endpoint.invoke('beep', 5).then(result => {
  // result === 12 * 5
});

```

# API

1. static connect(dist :string | HTMLIFrameElement | Window, dist1) 

   > 链接两个端点, 端点可以是 `window` 实例/iframe元素/iframe元素的id
   >
   > 此方法会向两个dist发送初始化事件,以及MessagePort

2. listen()

   > 监听来自当前window的消息. 此方法如果不调用,将不会响应来自其他页面的的函数调用.

3. unlisten()

   > 解除监听,与listen方法对应

4. destroy()

   > 摧毁用于通信的MessagePort, 与unlisten方法有很大不同, 使用的unlisten后再次调用listen,仍然可以监听并响应函数调用. 使用destroy后, 必须重新调用 connect 方法才能重新监听函数调用.



## QA

1. Endpoint.connect 函数应该在main中调用,还是iframe中调用?

   > 都可以, 但是还是建议在 iframe 中调用, 如果在 main page 中调用,请确保在调用 connect 之前保证 iframe page 中的Endpoint实例的已经初始化, 如果你不能保证 iframe 中Endpoint实例初始化在connect调用之前, 请在iframe page 中调用 connect.

2. Endpoint.connect 能在main和iframe中均调用吗?

   > 可以, 后一次执行connect时候会调用实例的destroy方法, 所以无论调用多少次, 此方法都是安全的


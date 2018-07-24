# simple-rpc

在iframe之间传递数据的简单RPC

# example

从iframe中导出一个方法

``` js
const RPC = require('simple-rpc');
const origin = document.referrer;

const rpc = new RPC(window, window.parent, origin, {
    beep (n) {
       document.querySelector('#n').textContent = n;
       return n * 12;
    }
});

```

在他的父级页面调用此方法:

``` js
const RPC = require('simple-rpc');
const frame = document.querySelector('iframe');
const usrc = new URL(frame.getAttribute('src'));
const origin = usrc.protocol + '//' + usrc.host;

frame.addEventListener('load', function (ev) {
    const rpc = new RPC(window, frame.contentWindow, origin);
    rpc.invoke('beep', 5).then(result => {
      document.querySelector('#result').textContent = result;
    });
});
```

# 方法

``` js

//ES6
import RPC from 'simple-rpc'

//ES5
const RPC = require('simple-rpc').default

```

## const rpc = new RPC(source, target, origin, methods)

将会创建一个 `rpc` 实例, 并且使用 
    source.addEventListener('message') 监听.
    target.postMessage() 发送数据.
 
`origin` 必须是一个URL 并且指向 target.
`origin` === `*` 将会发送消息给所有的监听器.


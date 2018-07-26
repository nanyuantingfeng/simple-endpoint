/**************************************************
 * Created by nanyuantingfeng on 2018/7/23 17:48.
 **************************************************/
import RPC, {IFrameLike} from '../RPC';
import url from 'url';
import {EventEmitter} from 'events';

const URL = (s) => url.parse(s);

let client_ee;
let server_ee;

let client: IFrameLike;
let server: IFrameLike;

beforeEach(() => {

  client_ee = new EventEmitter();
  server_ee = new EventEmitter();

  client = {

    addEventListener (name, cb) {
      expect(name).toBe('message');
      client_ee.on(name, cb);
    },

    postMessage (data) {
      client_ee.emit('message', {
        origin: server.origin,
        data: data,
      });
    },

    origin: 'http://frame.com',
  };

  server = {

    addEventListener (name, cb) {
      expect(name).toBe('message');
      server_ee.on(name, cb);
    },

    postMessage (data) {
      server_ee.emit('message', {
        origin: client.origin,
        data: data,
      });
    },

    origin: 'http://parent.com',
  };
});

test('methods obejct', async () => {
  const a_rpc = new RPC(client, server, server.origin, {
    async demo (n) {
      expect(n).toBe(5);
      return n * 111111;
    },
  });

  const b_rpc = new RPC(server, client, client.origin);

  const d = await b_rpc.invoke('demo', 5);
  expect(d).toBe(555555);
});

test('methods function', async () => {

  const a_rpc = new RPC(client, server, server.origin, rpc => {
    expect(typeof rpc.invoke).toBe('function');
    expect(rpc.origin).toBe(server.origin);

    return {
      demo (n) {
        expect(n).toBe(101);
        return n * 111;
      },
    };
  });

  const b_rpc = new RPC(server, client, client.origin);

  const d = await b_rpc.invoke('demo', 101);
  expect(d).toBe(11211);

});

test('methods two-way obejct', async () => {

  const a_rpc = new RPC(client, server, server.origin, rpc => {
    expect(typeof rpc.invoke).toBe('function');
    expect(rpc.origin).toBe(server.origin);
    return {
      demo (n) {
        expect(n).toBe(101);
        return n * 111;
      },
    };
  });

  const b_rpc = new RPC(server, client, client.origin, {
    ccc (n) {
      expect(n).toBe(777);
      return 999;
    },
  });

  const d = await b_rpc.invoke('demo', 101);
  expect(d).toBe(11211);

  const g = await a_rpc.invoke('ccc', 777);
  expect(g).toBe(999);

});

test('override message', async () => {

})


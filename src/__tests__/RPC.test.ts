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
let server;

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
  const server_rpc = new RPC(client, server, server.origin, {
    async demo (n) {
      expect(n).toBe(5);
      return n * 111111;
    },
  });

  const client_rpc = new RPC(server, client, client.origin);

  const d = await client_rpc.invoke('demo', 5);
  expect(d).toBe(555555);
});

test('methods function', async () => {

  const server_rpc = new RPC(client, server, server.origin, rpc => {
    expect(typeof rpc.invoke).toBe('function');
    expect(rpc.origin).toBe(server.origin);

    return {
      demo (n) {
        expect(n).toBe(101);
        return n * 111;
      },
    };
  });

  const client_rpc = new RPC(server, client, client.origin);

  const d = await client_rpc.invoke('demo', 101);
  expect(d).toBe(11211);

});

export interface IFrameLike {
    addEventListener: (name: string, callback: (event?: any) => void, capture?: boolean) => void;
    removeEventListener?: (name: string, callback: (event?: any) => void, capture?: boolean) => void;
    postMessage?: (msg: any, orgin?: string) => void;
    origin?: string;
    [others: string]: any;
}
interface IMsg {
    protocol: string;
    arguments: any[];
    method?: string;
    sequence?: number;
    response?: any;
}
interface IEvent {
    origin?: string;
    data?: IMsg;
}
export default class RPC {
    source: IFrameLike;
    target: IFrameLike;
    origin: string;
    _$isDestroyed: boolean;
    _$sequence: number;
    _$callbacks: object;
    _$methods: object;
    constructor(source: IFrameLike, target: IFrameLike, origin: string, methods?: any);
    initialize(): void;
    send(msg: IMsg): void;
    destroy(): void;
    protected onMessage: (event: IEvent) => void;
    invoke(method: any, ...args: any[]): Promise<any>;
    handle(msg: IMsg): void;
    private __handleMethod;
    private __handleResponse;
}
export {};

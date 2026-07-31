declare module '@elemaudio/core' {
  export const el: Record<string, (...args: any[]) => any>;
}

declare module '@elemaudio/web-renderer' {
  export default class WebRenderer {
    initialize(context: AudioContext, options: AudioWorkletNodeOptions): Promise<AudioNode>;
    render(...nodes: any[]): Promise<unknown>;
    on(event: string, listener: (payload: any) => void): void;
  }
}

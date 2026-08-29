/// <reference types="vite/client" />

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module 'animejs' {
  export interface AnimationParams {
    [key: string]: any;
  }
  export function animate(targets: any, parameters: AnimationParams): any;
  export function createTimeline(parameters?: any): any;
  export function stagger(value: number | string | number[], params?: any): any;
  export class Timeline {
    add(targets: any, parameters: any, position?: any): this;
    sync(synced?: any, position?: any): this;
    set(targets: any, parameters: any, position?: any): this;
  }
}

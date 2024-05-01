import { ReactiveElement } from "lit";
import { TreeStore } from "yaati";

const legacyProperty = (
  options: object | undefined,
  proto: Object,
  name: PropertyKey,
  descriptor: object
) => {
  const hasOwnProperty = proto.hasOwnProperty(name);
  (proto.constructor as typeof ReactiveElement).createProperty(
    name,
    hasOwnProperty ?
      {...options, state: true, noAccessor: true, hasChanged: (newValue, oldValue) => 
        { return !((oldValue as any).id == (newValue as any).id)} }
      : options
  );
  return Object.defineProperty(proto, name, descriptor)
};

export function yaati({ path } : { path: string }) : YaatiDecorator & any {
  return (protoOrDescriptor: any, name: string): any => {
    const descriptor = {
      get(this: HTMLElement & { store: TreeStore }) {
        if(!this.store) return;
        return this.store.getCursor(path)?.data
      },
      set(this: HTMLElement & { store: TreeStore }, payload) {
        if(!this.store || typeof this.store.setLocal !== 'function') return;
        const oldValue = this.store.getCursor(path);
        try {
          this.store.setLocal({ data: payload, path })
        } catch (error) {
          console.error('Error updating Yaati store at path :>> ', error);
        }
        (this as any).requestUpdate(name, oldValue);
      },
      enumerable: true,
      configurable: true,
    };

    if (name !== undefined) {
      // legacy TS decorator
      return legacyProperty({path}, protoOrDescriptor, name, descriptor) as any
    } else {
      // TC39 Decorators proposal
      return {
        kind: 'method',
        placement: 'prototype',
        key: protoOrDescriptor.key,
        descriptor,
      } as any
    }
  };
}

export type Interface<T> = {
  [K in keyof T]: T[K];
};

// Overloads for property decorator so that TypeScript can infer the correct
// return type when a decorator is used as an accessor decorator or a setter
// decorator.
export type YaatiDecorator = {
  // accessor decorator signature
  <C extends Interface<ReactiveElement>, V>(
    target: ClassAccessorDecoratorTarget<C, V>,
    context: ClassAccessorDecoratorContext<C, V>
  ): ClassAccessorDecoratorResult<C, V>;

  // setter decorator signature
  <C extends Interface<ReactiveElement>, V>(
    target: (value: V) => void,
    context: ClassSetterDecoratorContext<C, V>
  ): (this: C, value: V) => void;

  // legacy decorator signature
  (
    protoOrDescriptor: Object,
    name: PropertyKey,
    descriptor?: PropertyDescriptor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any;
};
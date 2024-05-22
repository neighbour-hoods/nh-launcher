interface EventOptions {
  /** should event bubble through the DOM */
  bubbles?: boolean;
  /** event is cancelable */
  cancelable?: boolean;
  /** can event bubble between the shadow DOM and the light DOM boundary */
  composed?: boolean;
}

export type NHAlertEventOptions = {
  title: string,
  msg: string,
  closable?: boolean,
}

export class EventEmitter<NHAlertEventOptions> {
  constructor(private target: HTMLElement, private alertType: "success" | "danger") {}

  emit(value: NHAlertEventOptions, options: EventOptions = { bubbles: true, cancelable: false, composed: true }) {
    if(!(value?.msg) || !(value?.title)) throw new Error("Invalid alert dispatched");

    this.target.dispatchEvent(
      new CustomEvent<NHAlertEventOptions>("trigger-alert", { ...options, detail: { type: this.alertType, closable: true, ...value } })
    );
  }
}

/**
 * Decorator for event emitter for (nh-alert) `trigger-alert` event.
 * Name the field after the variant of nh-alert that you want to trigger:
 * `@alertEvent() success;` OR `@alertEvent() danger;`
 * 
 *
 * Then emit like so:
 *  `this.danger.emit({
      title: "An error has occurred",
      msg: "This is the message!"
    })`
 */
export function alertEvent() {
  return (protoOrDescriptor: any, name: "success" | "danger"): any => {
    const descriptor = {
      get(this: HTMLElement) {
        return new EventEmitter<NHAlertEventOptions>(this, name !== undefined ? name : protoOrDescriptor.key);
      },
      enumerable: true,
      configurable: true,
    };

    if (name !== undefined) {
      // legacy TS decorator
      return Object.defineProperty(protoOrDescriptor, name, descriptor);
    } else {
      // TC39 Decorators proposal
      return {
        kind: 'method',
        placement: 'prototype',
        key: protoOrDescriptor.key,
        descriptor,
      };
    }
  };
}

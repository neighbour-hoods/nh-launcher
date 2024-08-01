import { Constructor, NHDelegateReceiverConstructor } from '@neighbourhoods/client';
import { TemplateResult, html } from "lit";
import { BlockRenderer } from ".";

export default function updateComponent<D>(delegate: D, Renderer: Constructor<BlockRenderer<D>>) : (component: NHDelegateReceiverConstructor<D>) => TemplateResult {
  const blockRendererInstances = new WeakMap();

  const registry = new global.FinalizationRegistry((heldValue) => {
    console.log(`FinalizationRegistry: ${heldValue} has been garbage collected`);
  });
  let componentRef;

  return (component: NHDelegateReceiverConstructor<D>) => {
    componentRef = new global.WeakRef(component);
    registry.register(component, 'TestComponent');

    if (!blockRendererInstances.has(component)) {
      // Instantiate a new block renderer and assign properties
      const blockRenderer =  new Renderer;
      blockRenderer.component = component;
      blockRenderer.nhDelegate = delegate;

      blockRendererInstances.set(component, blockRenderer);
    }
    return html`${blockRendererInstances.get(component)._element}`;
  };
}
import { Constructor, NHDelegateReceiverConstructor } from '@neighbourhoods/client';
import { TemplateResult, html } from "lit";
import { BlockRenderer } from ".";

export default function updateComponent<D>(delegate: D, Renderer: Constructor<BlockRenderer<D>>) : (component: NHDelegateReceiverConstructor<D>) => TemplateResult {
  const blockRendererInstances = new WeakMap();

  return (component: NHDelegateReceiverConstructor<D>) => {
    if (!blockRendererInstances.get(component)) {
      // Instantiate a new block renderer and assign properties
      const blockRenderer =  new Renderer;
      blockRenderer.component = component;
      blockRenderer.nhDelegate = delegate;

      blockRendererInstances.set(component, blockRenderer);
    }

    return html`${blockRendererInstances.get(component)._element}`;
  };
}
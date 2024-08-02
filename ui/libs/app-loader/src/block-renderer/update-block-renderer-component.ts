import { Constructor, NHDelegateReceiverConstructor } from '@neighbourhoods/client';
import { TemplateResult, html } from "lit";
import { BlockRenderer } from ".";

/**
 * A higher-order function which, given a delegate and `BlockRenderer` constructor, returns a function that 
 *  - can be called with a `NHDelegateReceiverConstructor` to return a `TemplateResult`
 *  and will 
 *  - create a new block renderer when the component is new, or
 *  - use the memoised block renderer instance when the component is the same (e.g. after a re-render of the parent where the component didn't change)
 * 
 * WeakMap should ensure garbage collection of old components.
 * See `block-renderer.test.ts` for usage
 * 
 * @param delegate
 * @param Renderer
 * @returns (component: `NHDelegateReceiverConstructor<D>`) => `TemplateResult`
 */
export default function useBlockRendererMemo<D>(delegate: D, Renderer: Constructor<BlockRenderer<D>>) : (component: NHDelegateReceiverConstructor<D>) => TemplateResult {
  const blockRendererInstances = new WeakMap();

  return (component: NHDelegateReceiverConstructor<D>) => {
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
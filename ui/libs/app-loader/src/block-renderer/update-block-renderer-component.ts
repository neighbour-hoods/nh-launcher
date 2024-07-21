import { Constructor } from './../../../sensemaker-client/src/delegate';
import { TemplateResult, html } from "lit";
import { BlockRenderer } from ".";

const uniqueObjectId = (() => {
  let currentId = 0;
  const map = new WeakMap();

  return (object) => {
    if (!map.has(object)) {
      map.set(object, ++currentId);
    }

    return map.get(object);
  };
})();

export default function updateComponent<C, D>(component: C, delegate: D, Renderer: Constructor<BlockRenderer<D>>) : TemplateResult {
  console.log('update with component: ', component)

  const uniqueComponentId = uniqueObjectId(component);
  console.log('component id :', uniqueComponentId)
  console.log('Renderer plus component id :', Renderer.name + uniqueComponentId)
  //  TODO:
  // Try creating a closure with another weakmap to keep track of block renderer/component combos using above unique id. If there is a new component for that block renderer then return a new instance as below, and set up in a way that the first block renderer is garbage collected


  // Instantiate a new block renderer and assign properties
  const blockRenderer =  new Renderer;
  blockRenderer.component = component;
  blockRenderer.nhDelegate = delegate;

  // console.log('block renderer instance :',blockRenderer._element);
  // console.log('render result :>> ', html`${blockRenderer._element}`);
  return html`${blockRenderer._element}`

}
import { Constructor } from './../../../sensemaker-client/src/delegate';
import { TemplateResult } from "lit";
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

export default function updateComponent<C, D>(component: C, delegate: D, Renderer: Constructor<BlockRenderer<D>>) {
  console.log('update with component: ', component)

  const uniqueComponentId = uniqueObjectId(component);
  const uniqueComponentId2 = uniqueObjectId(component);
  console.log('component id :', uniqueComponentId)

  // Instantiate a new block renderer and assign properties
  const blockRenderer =  new Renderer;
  blockRenderer.component = component;
  blockRenderer.nhDelegate = delegate;

  // customElements.define(`block-renderer-${uniqueComponentId}`, Renderer)


  console.log('block renderer instance :',blockRenderer.render())
  return renderer

}
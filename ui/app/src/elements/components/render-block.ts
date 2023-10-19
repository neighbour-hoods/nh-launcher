import { ref } from "lit/directives/ref.js";
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";

export class RenderBlock extends LitElement {
  @property()
  elementClass!: HTMLElement & CustomElementConstructor

  @property({ attribute: true })
  elementTag!: string

  registry?: CustomElementRegistry

  renderRenderer(element: Element | undefined) {
    if (element) {
      const r = this.registry!
      if (r.get(this.elementTag) !== this.elementClass) {
        r.define(this.elementTag, this.elementClass)
      }
      element.innerHTML = `<${this.elementTag} />`
    }
  }

  override createRenderRoot() {
    this.registry = new CustomElementRegistry()

    const renderRoot = (this.renderOptions.creationScope = this.attachShadow({
      mode: 'open',
      customElements: this.registry,
    }));

    return renderRoot;
  }
  render() {
    return html`<div
      style="display: contents"
      ${ref((e) => this.renderRenderer(e))}
    ></div>`;
  }

  static styles = [
    css`
      :host {
        display: contents;
      }
    `,
  ];
}

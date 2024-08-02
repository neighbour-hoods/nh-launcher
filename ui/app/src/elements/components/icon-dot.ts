import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { css, html, LitElement } from "lit";
import { property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { sharedStyles } from "../../sharedStyles";

export class IconDot extends ScopedRegistryHost(LitElement) {
  @property()
  placement: "top" | "top-start" | "top-end" | "right" | "right-start" | "right-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" = "right";

  @property()
  icon!: string;

  @property()
  invisible: boolean = false;

  render() {
    return html`
      <div style="position: relative; display: flex; align-items: center;">
        <slot></slot>
        <div class="column center-content icon-dot ${classMap({invisible: this.invisible})}">
          <button>${this.icon}</button>
        </span>
      </div>
    `;
  }

  static get styles() {
    return [
      sharedStyles,
      css`
      :host {
        display: flex;
      }
      .icon-dot {
        background-color: #303f9f;
        position: absolute;
        border-radius: 50%;
        height: 17px;
        width: 17px;
        left: 5px;
        top: 0px;
        /* border: 1px solid white; */
      }

      .invisible {
        display: none;
      }
    `
    ];
  }
}

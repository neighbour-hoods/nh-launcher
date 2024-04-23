import { css, CSSResult, html, TemplateResult } from "lit";
import {property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { NHComponent } from './ancestors/base';
import NHButton from "./button";
import { SlDetails } from "@shoelace-style/shoelace";

export default class NHDropdownAccordion extends NHComponent {
  @property()
  open: boolean = false;

  render() : TemplateResult {
    return html`
      <sl-details
        class="${classMap({
          open: !!this.open,
        })}"
        .open=${!!this.open}
        @sl-hide=${(_e: Event) => { this.open = false }}
      >
        <div class="container">
          <slot name="inner-content"></slot>
          <slot name="actions">
            <div class="button-container ${classMap({
                open: !!this.open,
              })}"
            >
              <nh-button
                type="button"
                id="cancel"
                .variant=${'danger'}
                .size=${'md'}
              >Cancel</nh-button>
              <nh-button
                type="submit"
                id="confirm"
                .variant=${'success'}
                .size=${'md'}
              >Confirm</nh-button>
            </div>
          </slot>
        </div>
      </sl-details>`;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "sl-details": SlDetails,
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
        :host {
          position: relative;
          width: 100%;
          display: block;
        }

        .container,  sl-details::part(content) {
          height: 100%;
        }

        .button-container {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }

        slot[name="inner-content"] {
          color: var(--nh-theme-fg-default);
        }

        sl-details {
          margin-top: 3em;
        }

        sl-details.open::part(base) {
          opacity: 1;
        }

        sl-details::part(content) {
          min-height: 28rem;
          padding: calc(1px * var(--nh-spacing-xl));
        }

        sl-details::part(base) {
          opacity: 0;
          transition: 0.5s all cubic-bezier(0.4, 0, 1, 1);

          border-radius: calc(1px * var(--nh-radii-lg));
          background-color: var(--nh-theme-bg-surface);
          border-color: var(--nh-theme-fg-disabled);
          margin: 0 calc(1px * var(--nh-spacing-lg));
        }

        sl-details::part(summary-icon) {
          display: none;
        }
    `,
  ];
}

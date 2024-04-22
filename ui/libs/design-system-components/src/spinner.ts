import { SlSpinner } from '@shoelace-style/shoelace';
import { NHComponentShoelace } from './ancestors/base';

import { css, CSSResult, html, TemplateResult } from "lit";
import {property } from "lit/decorators.js";

export default class NHSpinner extends NHComponentShoelace {
  @property() type: "icon" | "page" = "page";

  render() : TemplateResult {
    switch (this.type) {
      case "icon":
        return html`<sl-spinner class="icon-spinner"></sl-spinner>`
        
      case "page":
        return html`<sl-spinner class="page-spinner"></sl-spinner>`
      default: return html``
    }
  }

  static elementDefinitions = {
    'sl-spinner': SlSpinner,
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .icon-spinner {
        font-size: 1.75rem;
        --speed: 10000ms;
        --track-width: 4px;
        --indicator-color: var(--nh-theme-accent-emphasis);
        margin: 3px
      }

      .page-spinner {
        position: static;
        left: calc(50vw - 2.5rem);
        top: calc(50vh - 2.5rem);
        font-size: 5rem;
        --track-width: 12px;
        --track-color: var(--nh-theme-accent-default);
        --indicator-color: var(--nh-theme-accent-subtle);
      }
    `,
];
}

import { NHComponent } from './ancestors/base';
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';

import { css, CSSResult, html, TemplateResult } from "lit";
import {property } from "lit/decorators.js";
import { repeat } from 'lit/directives/repeat.js';

export default class NHSkeleton extends NHComponent {
  @property() type!: "dashboard-basic-grid" | "dashboard-table-full" ;

  @property() columns: number = 5;
  @property() rows: number = 5;
  
  render() : TemplateResult {
    switch (this.type) {
      case "dashboard-basic-grid":
        return html`<div class="skeleton-main-container">
                        ${Array.from(Array(24)).map(
                          () => html`<sl-skeleton effect="pulse" class="skeleton-part"></sl-skeleton>`,
                        )}
                    </div>`
        
      case "dashboard-table-full":
        return html`<div class="skeleton-main-container" data-columns=${this.columns}>
                      ${repeat(Array.from(Array(this.columns)), () => +(new Date), (_) => html`<sl-skeleton effect="pulse" class="skeleton-part-header"></sl-skeleton>`)}
                      ${repeat(Array.from(Array(this.columns * this.rows)), () => +(new Date), (_) => html`<sl-skeleton effect="pulse" class="skeleton-part"></sl-skeleton>`)}
                    </div>`
      default: return html``
    }
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .skeleton-main-container {
        width: 100%;
        display: grid;
        grid-template-columns: minmax(26.5%, 255px) minmax(26.5%, 255px) repeat(2, minmax(24.5%, 175px));
        gap: calc(1px * var(--nh-spacing-sm));
        margin: calc(1px * var(--nh-spacing-sm));
        grid-template-rows: 86px repeat(8, 4rem);
      }
      .skeleton-main-container[data-columns="3"] {
        grid-template-columns: 204px 204px repeat(1, 140px);
      }
      .skeleton-main-container[data-columns="4"] {
        grid-template-columns: 204px 204px repeat(2, 140px);
      }
      .skeleton-main-container[data-columns="5"] {
        grid-template-columns: 204px 204px repeat(3, 140px);
      }
      .skeleton-main-container[data-columns="6"] {
        grid-template-columns: 204px 204px repeat(4, 140px);
      }
      .skeleton-part-header {
        --color: rgb(37, 31, 40);
        --sheen-color: rgb(37, 31, 40);
      }
      .skeleton-part {
        --color: var(--nh-theme-bg-surface);
        --sheen-color: var(--nh-theme-bg-surface);
      }
      .skeleton-part-header::part(indicator), .skeleton-part::part(indicator) {
        border-radius: calc(1px * var(--nh-radii-base));
        opacity: 1;
      }
      .skeleton-part-header::part(indicator) {
        border: 1px solid rgb(125, 112, 135);
      }
    `,
];
}

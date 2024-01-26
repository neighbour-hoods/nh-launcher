import { CSSResult, css, html } from 'lit';
import { NHComponentShoelace } from '@neighbourhoods/design-system-components';
import { SlSkeleton } from '@scoped-elements/shoelace';

export default class NHDashboardSkeleton extends NHComponentShoelace {
  render() {
    return html`
    <div class="container skeleton-overview">
      <main>
        <div class="skeleton-nav-container">
          ${[50, 40, 40, 55].map(
            width =>
              html`<sl-skeleton
                effect="sheen"
                class="skeleton-part"
                style="width: ${width}%; height: 2rem;"
              ></sl-skeleton>`,
          )}
          <sl-skeleton
            effect="sheen"
            class="skeleton-part"
            style="width: 80%; height: 2rem; opacity: 0"
          ></sl-skeleton>
        </div>
        <div class="skeleton-main-container">
          ${Array.from(Array(24)).map(
            () => html`<sl-skeleton effect="sheen" class="skeleton-part"></sl-skeleton>`,
          )}
        </div>
      </main>
    </div>
  `;
}

  static elementDefinitions = {
    'sl-skeleton': SlSkeleton,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        height: 100vh;
      }
      .container {
        display: flex;
        width: calc(100vw - 144px);
        height: 100%;
      }

      /**  Skeleton **/
      .skeleton-overview {
        background-color: var(--nh-theme-bg-canvas);
      }
      .skeleton-part {
        --color: var(--nh-theme-bg-surface);
        --sheen-color: var(--nh-theme-bg-detail);
      }
      .skeleton-part::part(indicator) {
        background-color: var(--nh-theme-bg-muted);
        border-radius: calc(1px * var(--nh-radii-base));
        opacity: 0.2;
      }
      .skeleton-tabs {
        width: 100%;
        height: 50px;
      }
      .skeleton-main-container {
        width: 100%;
        height: 100%;
      }
      .skeleton-overview main,
      .skeleton-nav-container {
        display: flex;
        flex-direction: column;
        width: 95%;
        column-gap: calc(1px * var(--nh-spacing-md));
        align-items: start;
        margin-bottom: 1rem;
        width: 100%;
      }
      .skeleton-nav-container {
        flex-direction: row;
        margin: calc(1px * var(--nh-spacing-md)) 12px calc(1px * var(--nh-spacing-md)) 0;
        width: 100%;
      }
      .skeleton-nav-container .skeleton-part::part(indicator) {
        border-radius: calc(1px * var(--nh-radii-lg));
      }
      .skeleton-main-container {
        display: grid;
        gap: calc(1px * var(--nh-spacing-md));
        grid-template-rows: 1fr 1fr 1fr 1fr;
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
        gap: calc(1px * var(--nh-spacing-sm));
      }
      .skeleton-overview nav {
        width: var(--menu-width);
        padding: calc(1px * var(--nh-spacing-sm));
        margin: calc(1px * var(--nh-spacing-sm));
        margin-top: calc(1px * var(--nh-spacing-xl));
      }
    `]
}

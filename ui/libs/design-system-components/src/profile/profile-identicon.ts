import { css, CSSResult, html, TemplateResult, } from "lit";
import { property } from "lit/decorators.js";
import { NHComponent } from "../ancestors/base";
import NHCard from "../card";

import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';
import { classMap } from "lit/directives/class-map.js";
import { b64images } from "@neighbourhoods/design-system-styles";

export default class NHProfileIdenticon extends NHComponent {
  @property()
  agentAvatarSrc!: string;
  @property()
  agentName!: string;
  @property()
  agentHashB64!: string;
  @property()
  loading: boolean = false;
  @property()
  background: boolean = true;
  @property()
  responsive: boolean = true;

  static elementDefinitions = {
    'nh-card': NHCard,
  }

  render() : TemplateResult {
    return html`
    <div class="container">
      ${this.loading 
        ? html`<nh-card
        class="nested-card${classMap({
          transparent: !this.background,
          responsive: this.responsive,
        })}"
        .theme=${"dark"}
        >
          <div class="content">
            <img class="identicon" src=${this.agentAvatarSrc || `data:image/svg+xml;base64,${b64images.nhIcons.blankProfile}`} alt="user identicon" />
            <sl-skeleton
                  effect="pulse"
                  class="skeleton-part"
                  style="width: ${60}%; height: 2rem;" 
            ></sl-skeleton>
          </div>
        </nh-card>` 
        : html`<nh-card
                  class="nested-card${classMap({
                    transparent: !this.background,
                    responsive: this.responsive,
                  })}"
                  .theme=${"dark"}
                  .hasContextMenu=${false}
                    .hasPrimaryAction=${true}
                    .textSize=${"sm"}
                    .footerAlign=${"c"}
                >
          <div class="content">
            <img class="identicon" src=${this.agentAvatarSrc || `data:image/svg+xml;base64,${b64images.nhIcons.blankProfile}`} alt="user identicon" />
            <h1>${this.agentName}</h1>
          </div>
        </nh-card>`
          }
          
        </div>
    `;
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
    /* Layout */
    nh-card {
      height: 100%;
      display: block;
      max-width: 6rem;
    }

    .transparent nh-card {
      background-color: transparent;
    }

    .content {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: calc(1px * var(--nh-spacing-lg));
    }
    
    .content > * {
      display: flex;
    }

    .responsive .content > img {
      width: clamp(2.75rem, 2.2813rem + 1.5vw, 2.125rem);
    }

    .responsive .content > * {
      display: flex;
      font-size: clamp(0.75rem, 0.2813rem + 1.5vw, 1.125rem);
    }

    .identicon {
      height: 4rem;
      border-radius: 3rem;
    }

    .responsive .identicon {
      height: auto;
      flex-shrink: 1;
    }

    h1 {
      color:  var(--nh-theme-fg-default);
    }
    .skeleton-part {
      --color: var(--nh-theme-bg-canvas);
      --sheen-color: var(--nh-theme-bg-surface);
    }
    .skeleton-part::part(indicator) {
      background-color: var(--nh-theme-bg-detail);
      border-radius: calc(1px * var(--nh-radii-base));
      opacity: 0.2;
    }
  `,
];
}

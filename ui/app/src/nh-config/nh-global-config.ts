import { html, css, PropertyValueMap } from 'lit';
import { contextProvided } from '@lit-labs/context';

import { MatrixStore } from '../matrix-store';
import { matrixContext, weGroupContext } from '../context';
import { DnaHash } from '@holochain/client';

import DimensionsConfig from './pages/nh-dimensions-config';
import {
  NHComponent, NHMenu,
} from '@neighbourhoods/design-system-components';
import { StoreSubscriber } from 'lit-svelte-stores';
import { provideWeGroupInfo } from '../matrix-helpers';
import { state } from 'lit/decorators.js';

export default class NHGlobalConfig extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;
  @contextProvided({ context: weGroupContext, subscribe: true })
  weGroupId!: DnaHash;

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @state()
  _nhName!: string;
  @state()
  _page: 'dimensions' | 'widgets' | undefined = 'dimensions'; // TODO: make this an enum

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if(this._neighbourhoodInfo?.value && !this?._nhName) {
      this._nhName = this._neighbourhoodInfo?.value.name
    }
  }

  renderPage() {
    switch (this._page) {
      case 'dimensions':
        return html`<dimensions-config></dimensions-config>`
      case 'widgets':
        return html`hi widgets`
      default:
        return html`Default Page`
    }
  }

  render() {
    return html`
      <main>
        <nh-menu
          .menuSectionDetails=${
            [
              {
                "sectionName": this._nhName,
                "sectionMembers": [
                  {
                    "label": "Overview",
                    "subSectionMembers": [],
                    callback: () => this._page = undefined
                  },
                  {
                    "label": "Roles",
                    "subSectionMembers": [],
                    callback: () => this._page = undefined
                  },
                ]
              },
              {
                "sectionName": "Sensemaker",
                "sectionMembers": [
                  {
                    "label": "Dimensions",
                    "subSectionMembers": [],
                    callback: () => this._page = 'dimensions'
                  },
                  {
                    "label": "Assessments",
                    "subSectionMembers": [],
                    callback: () => this._page = 'widgets'
                  },
                  {
                    "label": "Contexts",
                    "subSectionMembers": [],
                    callback: () => this._page = undefined
                  },
                ]
              },
              {
                "sectionName": "Member Management",
                "sectionMembers": [
                  {
                    "label": "Members",
                    "subSectionMembers": [],
                    callback: () => this._page = undefined
                  },
                  {
                    "label": "Invites",
                    "subSectionMembers": [],
                    callback: () => this._page = undefined
                  },
                ]
              }]}
          .selectedMenuItemId=${"Sensemaker-0"}
        >
        </nh-menu>
        <slot name="page">
              ${this.renderPage()}
        </slot>
      </main>
    `;
  }

  static elementDefinitions = {
    'nh-menu': NHMenu,
    'dimensions-config': DimensionsConfig,
  };

  static get styles() {
    return css`
      :host,
      .container {
        display: flex;
        width: 100%;
      }

      .container {
        flex-direction: column;
        align-items: flex-start;
      }

      main {
        width: 100%;
        display: grid;
        flex: 1;
        place-content: start;
        color: var(--nh-theme-fg-default);
        grid-template-columns: 1fr 3fr;
        grid-template-rows: 4rem auto;
        gap: calc(1px * var(--nh-spacing-sm));
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }
      nav {
        grid-column: 1 / -2;
        display: flex;
        align-items: start;
      }
      slot[name="page"] {
        grid-column: 2 / -2;
        display: flex;
        align-items: start;
      }
    `;
  }
}
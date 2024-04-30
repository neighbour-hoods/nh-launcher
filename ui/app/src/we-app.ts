import { tree_test } from './yaati-tree';
import { provide } from "@lit/context";
import { state, query, customElement } from "lit/decorators.js";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css, TemplateResult, PropertyValueMap } from "lit";
import './global-toast-styles.css'

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";
import { connectHolochainApp } from "@neighbourhoods/app-loader";
import { NHAlert } from "@neighbourhoods/design-system-components";
import { SlAlert } from "@scoped-elements/shoelace";
import { TreeStore } from "yaati";
import { StoreSubscriber } from 'lit-svelte-stores';

import { yaati } from './yaati-decorator';

@customElement('we-app')
export class WeApp extends ScopedRegistryHost(LitElement) {
  @provide({context: matrixContext})
  private _matrixStore!: MatrixStore;

  _allWeGroupInfos;
  
  @state()
  loading = true;

  async firstUpdated() {
    const {
      adminWebsocket,
      appWebsocket,
      appInfo: weAppInfo
    } = await connectHolochainApp('we');

    this._matrixStore = await MatrixStore.connect(appWebsocket, adminWebsocket, weAppInfo);

    this._allWeGroupInfos = new StoreSubscriber(this, () => this._matrixStore.weGroupInfos());

    this.store = new TreeStore(tree_test);
    this.loading = false;
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    this._alert = this.renderRoot.querySelector('nh-alert') as NHAlert;

debugger;
  }

  @state() store : TreeStore;
  @yaati({path: "root.a.3"}) accessor path1!: undefined | any;

  @state() _alertTitle!: string | undefined;
  @state() _alertMsg!: string | undefined;
  @state() _alertClosable: boolean = true;
  @state() _alertType!: "success" | "danger" | undefined;
  @state() _alert!: NHAlert;

  renderAlert(): TemplateResult {
    return html`
      <nh-alert
        id="alert"
        .title=${this._alertTitle}
        .description=${this._alertMsg}
        .type=${this._alertType}
        .closable=${this._alertClosable}
        .isToast=${true}
        .open=${false}
      >
      </nh-alert>
    `
  }

  render() {
    if (this.loading)
      return html`<div class="row center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`<p>${this.path1.id}</p><button @click=${() => this.path1 = "whatever"}>Click Me</button>`;
  }

  static elementDefinitions = {
      "main-dashboard": MainDashboard,
      'nh-alert': NHAlert
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          margin: 0px;
          height: 100vh;
          display: flex;
        }
        main-dashboard {
          flex: 1
        }
      `,
    ];
  }
}

import { provide } from "@lit/context";
import { state, query, customElement } from "lit/decorators.js";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css } from "lit";
import './global-toast-styles.css'

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";
import { connectHolochainApp } from "@neighbourhoods/app-loader";
import { NHAlert } from "@neighbourhoods/design-system-components";

@customElement('we-app')
export class WeApp extends ScopedRegistryHost(LitElement) {
  @provide({context: matrixContext})
  private _matrixStore!: MatrixStore;

  @state()
  loading = true;

  async firstUpdated() {
    const {
      adminWebsocket,
      appWebsocket,
      appInfo: weAppInfo
    } = await connectHolochainApp('we');

    this._matrixStore = await MatrixStore.connect(appWebsocket, adminWebsocket, weAppInfo);


    // TODO: add code to prefetch groups and register applets here.

    this.loading = false;
  }

  @state() _alertTitle!: string | undefined;
  @state() _alertMsg!: string | undefined;
  @state() _alertClosable: boolean = true;
  @state() _alertType!: "success" | "danger" | undefined;
  @state() _alertStateReady: boolean = false;
  @query('#alert') private _alert;

  render() {
    if (this.loading)
      return html`<div class="row center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html` <main-dashboard  
      @trigger-alert=${async (e: CustomEvent) =>{
        const {title, msg, closable, type} = e.detail;
        console.log('title, msg, closable, type :>> ', title, msg, closable, type);
        this._alertTitle = title;
        this._alertMsg = msg;
        this._alertType = type;
        this._alertClosable = closable;
        this._alertStateReady = true;
        await this.updateComplete;
        setTimeout(() => this._alert.openToast.call(this._alert), 0);
      }} 
      >
        <nh-alert
          id="alert"
          .title=${this._alertStateReady && this._alertTitle}
          .description=${this._alertStateReady && this._alertMsg}
          .type=${this._alertStateReady && this._alertType}>
          .closable=${this._alertClosable}
          .isToast=${true}
          .open=${false}
        </nh-alert>
      </main-dashboard> `;
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

import { provide } from "@lit/context";
import { state, customElement } from "lit/decorators.js";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css, TemplateResult, PropertyValueMap } from "lit";
import './global-toast-styles.css'

import { sharedStyles } from "./sharedStyles";
import { MatrixStore } from "./matrix-store";
import { matrixContext } from "./context";
import { MainDashboard } from "./main-dashboard";
import { connectHolochainApp } from "@neighbourhoods/app-loader";

import NHAlert from '@neighbourhoods/design-system-components/alert';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';

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

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    this._alert = this.renderRoot.querySelector('nh-alert') as NHAlert;
  }

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
    if (this.loading) return html`<nh-spinner type=${"icon"}></nh-spinner>`;

    return html` <main-dashboard  
      @trigger-alert=${async (e: CustomEvent) =>{
        const {title, msg, closable, type} = e.detail;
        this._alertTitle = title;
        this._alertMsg = msg;
        this._alertType = type;
        this._alertClosable = closable;
        this.requestUpdate()
        await this.updateComplete;

        const newAlert = this._alert?.cloneNode(true) as NHAlert;
        const newSlAlert = this._alert.alert?.cloneNode(true);
        newAlert.title = title;
        newAlert.description = msg;
        newSlAlert.variant = type;
        newAlert.alert = newSlAlert;
        document.body.querySelector('.sl-toast-stack')?.replaceChildren(newAlert.alert)
        newAlert.alert?.toast()
        this._alert = newAlert;
      }} 
      >
      ${this.renderAlert()}
      </main-dashboard> `;
  }

  static elementDefinitions = {
      "main-dashboard": MainDashboard,
      "nh-spinner": NHSpinner,
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

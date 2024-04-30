import { state, query, customElement } from "lit/decorators.js";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { LitElement, html, css } from "lit";

import { MatrixStore } from "./matrix-store";
import { GetPath } from "typed-object-tweezers";
import { connectHolochainApp } from "@neighbourhoods/app-loader";
import { NHAlert } from "@neighbourhoods/design-system-components";
import { TreeState, TreeStore } from "yaati";
import { get } from 'svelte/store';
import { CreateNeighbourhoodDialog } from './elements/dialogs/create-nh-dialog';

enum AppState { // Listed in chronological order, followed by those injected dependencies that have a meaningful value by this point
  Boot = "boot",
    // has:
  WeConnected = "we-connected",
    // has: adminWebsocket, appWebsocket, weAppInfo 
  InitMatrix = "init-matrix",
    // has: MatrixStore
  LoadedNeighbourhoods = "loaded-neighbourhoods",
    // has: allWeGroupInfos
  InNeighbourhood = "in-neighbourhood",
  LoadedApplets = "loaded-applets",
  InApplet = "in-applet"
}

@customElement('we-app')
export class WeApp extends ScopedRegistryHost(LitElement) {
  @state() appState: AppState = AppState.Boot;

  @state() store: TreeStore;

  @state() selectedNhId!: Uint8Array;

  @query("create-nh-dialog") _createNHDialog;

  async firstUpdated() {
    const weConnection = await connectHolochainApp('we');
    this.appState = AppState.WeConnected;

    this.initStore(weConnection)
  }

  private async initStore(connection) {
    const bootTree = await this.buildTree({id: "boot", path: "boot"}, {[AppState.WeConnected]: {id: AppState.WeConnected,  path: "boot.we-connected", connection}});
    this.store = new TreeStore(bootTree);
  }

  private updateStore(): void {
    debugger;
    this.store.setLocal(this.buildTree())
  }

  private async buildTree(init?: TreeState<string, any>, update?: TreeState<string, any>): TreeState<string, any> {
    let tree: TreeState = init;
    let newTree: TreeState;

    switch (this.appState) {
      case AppState.WeConnected:
        const { appWebsocket, adminWebsocket, weAppInfo } = update[AppState.WeConnected].connection; 
        const matrixStore = await MatrixStore.connect(appWebsocket, adminWebsocket, weAppInfo);

        newTree = {...tree, ...update };
        this.appState = AppState.InitMatrix;
        return this.buildTree({...newTree}, { [AppState.InitMatrix]: { id: AppState.InitMatrix, path: "boot.we-connected.init-matrix", matrixStore} })

      case AppState.InitMatrix:
        newTree = { ...tree, [AppState.WeConnected]: {...tree[AppState.WeConnected], ...update} };
        const neighbourhoods = get(update[AppState.InitMatrix].matrixStore.weGroupInfos())
        this.appState = AppState.LoadedNeighbourhoods;
        return this.buildTree({...newTree}, {[AppState.LoadedNeighbourhoods]: { id: AppState.LoadedNeighbourhoods,  path: "boot.we-connected.init-matrix.loaded-neighbourhoods", neighbourhoods} })

      case AppState.LoadedNeighbourhoods:
        newTree = { ...tree, [AppState.WeConnected]: {...tree[AppState.WeConnected], [AppState.InitMatrix]: {...tree[AppState.WeConnected][AppState.InitMatrix], ...update}} };
        return newTree

      default:
        return tree
    }
  }

  renderPage() {
    // Emulation of different main-dashboard states and providing a yaati tree instance to several components,
    // each component will use different parts of the tree for each use case,
    // You can imagine there being a top level state machine that will only allow you to route to a certain page
    // once the prerequisites for that branch of the yaati tree being fully populated with values is met,
    // but for now I will just use conditionals.  
    if (this.appState == AppState.Boot || this.appState == AppState.WeConnected)
      return html`<div class="row center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;
      
      console.log('this.appState :>> ', this.store?.getSnapshot());

      if (this.appState == AppState.LoadedNeighbourhoods) return html`
        <create-nh-dialog @we-added=${({detail: selectedNhId}) => {
          this.selectedNhId = selectedNhId;
          this.appState = AppState.InNeighbourhood;
          this.updateStore()
        }}> </create-nh-dialog>
      `;

    // return html`<p>${this.path1}</p><button @click=${() => this.path1 = "whatever"}>Click Me</button>`;
  }
  render() {
    return html`
      <button class="create" @click=${() => {if(this._createNHDialog) this._createNHDialog.dialog._dialog.show() }}>Create NH</button>
      ${this.renderPage()}
      `

  }

  static elementDefinitions = {
      'create-nh-dialog': CreateNeighbourhoodDialog,
      'nh-alert': NHAlert
  }

  static get styles() {
    return [
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

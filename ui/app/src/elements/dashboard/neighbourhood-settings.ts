import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { DnaHash } from "@holochain/client";
import { consume } from "@lit/context";
import { css, html } from "lit";
import { StoreSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { AppletInstanceStatusList } from "../components/applet-instance-status-list";
import { UninstalledAppletInstanceList } from "../components/uninstalled-applet-instance-list";
import { JoinableAppletInstanceList } from "../components/joinable-applet-instance-list";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { LeaveNeighbourhood } from "../dialogs/leave-neighbourhood";
import { provideWeGroupInfo } from "../../matrix-helpers";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

export class NeighbourhoodSettings extends NHComponent {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @consume({ context: profilesStoreContext, subscribe: true })
  @property({attribute: false})
  _profilesStore!: ProfilesStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  @consume({ context: sensemakerStoreContext, subscribe: true })
  @property({attribute: false})
  _sensemakerStore!: SensemakerStore;

  _neighbourhoodInfo = new StoreSubscriber(
    this,
    () => provideWeGroupInfo(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId]
  );

  @state()
  private _showAppletDescription: boolean = false;

  @query("#leave-nh-dialog")
  _leaveGroupDialog!: LeaveNeighbourhood;

  toggleAppletDescription() {
    this._showAppletDescription = !this._showAppletDescription;
  }

  render() {
    return html`
      <leave-nh-dialog id="leave-nh-dialog" .weGroupId=${this.weGroupId}></leave-nh-dialog>

      <slot name="to-join">
        <h3>Applets to Join</h3>
        <hr />
        <joinable-applet-instance-list></joinable-applet-instance-list>
      </slot>

      <slot name="installed">
        <h3>Installed Applets</h3>
        <hr />
        <applet-instance-status-list></applet-instance-status-list>
      </slot>

      <slot name="uninstalled">
        <h3>Uninstalled Applets</h3>
        <hr />
        <uninstalled-applet-instance-list></uninstalled-applet-instance-list>
      </slot>

      <slot name="danger-zone">
        <h3>Danger Zone</h3>
        <hr />

        <div style="display: flex; align-items: center;">
          <p>Leave neighbourhood and delete all applets: </p>
          <span style="flex: 1"></span>
          <nh-button
            .size=${"auto"}
            .variant=${"danger"}
            @click=${() => this._leaveGroupDialog.open()}
          >Leave Neighbourhood</nh-button>
        </div>
      </slot>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-spinner": NHSpinner,
    "leave-nh-dialog": LeaveNeighbourhood,
    "joinable-applet-instance-list": JoinableAppletInstanceList,
    "applet-instance-status-list": AppletInstanceStatusList,
    "uninstalled-applet-instance-list": UninstalledAppletInstanceList,
  }

  static get styles() {
    return css`
    :host {
      display: flex;
    }

    hr {
      border-color: var(--nh-theme-bg-detail);
      border-style: double;
      width: 100%;
    }

    /** Typo **/
    p {
      color: var(--nh-theme-fg-muted);
    }
    h3 {
      font-weight: 400;
      color: var(--nh-theme-fg-default);
      margin: calc(1px * var(--nh-spacing-xs)) 0;
    }
  `;
  }
}

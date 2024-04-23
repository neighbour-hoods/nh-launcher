import { CSSResult, html } from "lit";
import { property, query } from "lit/decorators.js";

import NHAlert from '@neighbourhoods/design-system-components/alert';
import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

import { consume } from "@lit/context";
import { DnaHash } from "@holochain/client";
import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

export class LeaveNeighbourhood extends NHComponent {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @property()
  weGroupId!: DnaHash;

  @property()
  private _isOpen: boolean = false;

  @query('nh-dialog')
  private _dialog;

  open() {
    this._dialog.showDialog();
  }

  async leaveGroup() {
    const weGroupName = this._matrixStore.getNeighbourhoodInfo(this.weGroupId)?.name;
    try {
      await this._matrixStore.leaveWeGroup(this.weGroupId, true);
      await this.updateComplete;
      this.dispatchEvent(
        new CustomEvent("trigger-alert", {
          detail: { 
            title: "Neighbourhood Left Successfully",
            msg: "You will no longer be a part of this Neighbourhood.",
            type: "success",
            closable: true,
          },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      this.dispatchEvent(
        new CustomEvent("trigger-alert", {
          detail: { 
            title: "Error while leaving Neighbourhood",
            msg: "Check your developer console for more information.",
            type: "success",
            closable: true,
          },
          bubbles: true,
          composed: true,
        })
      );
      console.log("Error while leaving neighbourhood:", e);
    };

    this.dispatchEvent(
      new CustomEvent("group-left", {
        detail: { weGroupName },
        composed: true,
        bubbles: true,
      })
    );
  }

  render() {
    return html`
      <nh-dialog
        id="leave-neighbourhood"
        .title=${"Leave Neighbourhood"}
        .dialogType=${"leave-neighbourhood"}
        .size=${"medium"}
        .handleOk=${() => this.leaveGroup()}
        .isOpen=${this._isOpen}
        .primaryButtonDisabled=${false}
      >
        <div slot="inner-content">
          <nh-card .theme=${"dark"} .title="" .heading="" class="nested-card">
            <nh-alert
              .title=${"Are you sure?"}
              .closable=${false}
              .type=${"danger"}
            >
            </nh-alert>
            This will:
            <ul>
              <li>delete all applets that you have installed for this neighbourhood, together with all the data you have stored in these applets</li>
              <li>delete your profile for this neighbourhood</li>
            </ul>
            <p slot="footer">
              Other members of the neighbourhood will still have access to their instances of the neighbourhood's applets.
            </p>
          </nh-card>
        </div>
      </nh-dialog>
    `;
  }

  static elementDefinitions = {
    "nh-alert": NHAlert,
    "nh-dialog": NHDialog,
    "nh-button": NHButton,
    "nh-card": NHCard,
  }

  static get styles() {
    return [
      super.styles as CSSResult,
    ]
  }
}

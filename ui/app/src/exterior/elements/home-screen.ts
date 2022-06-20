import { HeaderHashB64, AgentPubKeyB64, serializeHash } from "@holochain-open-dev/core-types";
import { JoinMembraneInvitation } from "@holochain-open-dev/membrane-invitations";
import { contextProvided } from "@lit-labs/context";
import { decode } from "@msgpack/msgpack";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { html, LitElement, css } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { Button, List, ListItem, Card, Snackbar, Icon } from "@scoped-elements/material-web";

import { wesContext } from "../context";
import { WesStore } from "../wes-store";
import { sharedStyles } from "../../sharedStyles";
import { query } from "lit/decorators.js";
import { HoloIdenticon } from "@holochain-open-dev/utils";
import { CreateWeDialog } from "./create-we-dialog";
import { SlTooltip } from "@scoped-elements/shoelace";


export class HomeScreen extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: wesContext })
  wesStore!: WesStore;

  _myInvitations = new TaskSubscriber(this, () =>
    this.wesStore.membraneInvitationsStore.fetchMyInvitations()
  );

  @query("#we-dialog")
  _weDialog!: CreateWeDialog;

  @query("#copied-snackbar")
  _copiedSnackbar!: Snackbar;

  async join(
    invitationHeaderHash: HeaderHashB64,
    invitation: JoinMembraneInvitation
  ) {
    const properties = decode(invitation.cloneDnaRecipe.properties) as any;
    await this.wesStore.joinWe(
      invitationHeaderHash,
      properties.name,
      properties.logo_src,
      properties.timestamp
    )
    .then()
    .catch((e) => {
      if (e.data.data) {
        if (e.data.data.includes("AppAlreadyInstalled")) {
          (this.shadowRoot?.getElementById("error-snackbar") as Snackbar).show();
        }
      }
    });
  }

  async removeInvitation(invitationHeaderHash: HeaderHashB64) {
    await this.wesStore.removeInvitation(invitationHeaderHash);
  }

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.cloneDnaRecipe.properties) as any).logo_src;
  }

  inviter(invitation: JoinMembraneInvitation) {
    return invitation.inviter;
  }

  renderErrorSnackbar() {
    return html`
      <mwc-snackbar style="text-align: center;" id="error-snackbar" labelText="You are already part of this We!">
      </mwc-snackbar>
    `;
  }


  renderInvitations(
    invitations: Record<HeaderHashB64, JoinMembraneInvitation>
  ) {
    if (Object.entries(invitations).length == 0) {
      return html`
        <div class="default-font">You have no open invitations...</div>
        <mwc-button style="margin-top: 20px;" @click=${() => this._myInvitations.run()} icon="refresh">Refresh</mwc-button>
      `;
    } else {
      return html `
      ${Object.entries(invitations).map(
        ([headerHash, invitation]) => {
          return html`
                <mwc-card style="max-width: 800px; margin: 5px;">
                    <div class="row" style="align-items: center; padding: 5px; padding-left: 15px; font-size: 1.2em" >
                    <holo-identicon .hash=${this.inviter(invitation)}></holo-identicon>
                    <span style="margin-left: 10px;">invited you to join</span>
                    <img style="margin-left: 10px;" class="we-image" src=${this.weImg(invitation)}>
                    <div style="font-weight: bold; margin-left: 10px;">${this.weName(invitation)}</div>
                      <div class="row" style="margin-left: auto;">
                        <mwc-button
                          class="accept-invitation"
                          raised
                          label="JOIN"
                          icon="check"
                          @click=${() => this.join(headerHash, invitation)}
                        ></mwc-button>
                        <mwc-button
                          class="delete-invitation"
                          raised
                          label="REJECT"
                          icon="close"
                          @click=${() => this.removeInvitation(headerHash)}>
                        </mwc-button>
                      </div>
                    </div>
                </mwc-card>
            `
          }
        )}
      <mwc-button style="margin-top: 20px;" @click=${() => this._myInvitations.run()} icon="refresh">Refresh</mwc-button>
      `
    }

  }


  renderInvitationsBlock(
    invitations: Record<HeaderHashB64, JoinMembraneInvitation>
  ) {
    return html`
      ${this.renderErrorSnackbar()}
      <div class="row title center-content" style="margin-top: 100px;"><mwc-icon>mail</mwc-icon><span style="margin-left: 10px;">invitations</span></div>
      <div class="column center-content" style="justify-content: space-between; margin-top: 30px;">
      ${this.renderInvitations(invitations)}
      </div>
    `;
  }

  render() {
    return html`

      <create-we-dialog id="we-dialog"></create-we-dialog>
      <mwc-snackbar id="copied-snackbar" timeoutMs=4000 labelText="Copied!" style="text-align: center;"></mwc-snackbar>

      <div class="column content-pane center-content">
        <mwc-button

          raised
          icon="add"
          style="margin-top: 60px;"
          @click=${() => this._weDialog.open()}
          >Create New Group
        </mwc-button>

        ${this._myInvitations.render({
          complete: (i) => this.renderInvitationsBlock(i),
        })
        }

        <div class="column center-content">
          <div class="row title center-content" style="margin-top: 100px;"><mwc-icon>key</mwc-icon><span style="margin-left: 10px;">your public key</span></div>
          <div class="default-font" style="margin-top: 30px;">
            <sl-tooltip placement="right" .content=${"copy"}>
              <div class="pubkey-field default-font" @click=${() => {navigator.clipboard.writeText(this.wesStore.myAgentPubKey); this._copiedSnackbar.show()}}>
                  ${this.wesStore.myAgentPubKey}
              </div>
            </sl-tooltip>
            <div style="margin-top: 3px; font-size: 0.8em; color: gray; text-align: center">
            send your public key to your friends if they want to invite you to their group
            </div>
          </div>
        </div>
      </div>
    `;
  }


  static get scopedElements() {
    return {
      "mwc-button": Button,
      "mwc-list": List,
      "mwc-list-item": ListItem,
      "mwc-card": Card,
      "mwc-icon": Icon,
      "mwc-snackbar": Snackbar,
      "holo-identicon": HoloIdenticon,
      "create-we-dialog": CreateWeDialog,
      "sl-tooltip": SlTooltip,
    };
  }

  static get styles() {
    let localStyles = css`
      .content-pane {
        padding: 30px;
        font-family: Arial, sans-serif,
      }

      .default-font {
        font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

      .title {
        align-items: center;
        font-family: Roboto, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 1.2em;
        text-align: center;
      }

      .accept-invitation {
        --mdc-theme-primary: #17c200;
      }

      .delete-invitation {
        --mdc-theme-primary: #cf0000;
        margin-left: 5px;
      }

      .we-image {
        height: 30px;
        width: 30px;
        border-radius: 50%;
      }

      .pubkey-field {
        color: black;
        background: #f4f0fa;
        border-radius: 4px;
        overflow-x: scroll;
        padding: 10px;
        white-space: nowrap;
        cursor: pointer;
      }

    `

    return [sharedStyles, localStyles];
  }
}

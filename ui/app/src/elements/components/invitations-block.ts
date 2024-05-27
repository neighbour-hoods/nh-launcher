import { css, CSSResult, html } from "lit";
import { consume } from "@lit/context";
import { property, query, state } from "lit/decorators.js";

import { MatrixStore } from "../../matrix-store";
import { matrixContext, weGroupContext } from "../../context";
import { DnaHash, AgentPubKeyB64, decodeHashFromBase64 } from "@holochain/client";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHTextInput from '@neighbourhoods/design-system-components/input/text';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { b64images } from "@neighbourhoods/design-system-styles";
import { alertEvent } from "../../decorators/alert-event";

export class InvitationsBlock extends NHComponent {
  // TODO: add Yup schema for hash validation
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  @alertEvent() success;
  @alertEvent() danger;

  @state()
  _inviteePubKey: AgentPubKeyB64 | undefined;

  @query("nh-text-input")
  _pubkeyField!: NHTextInput;

  async inviteToJoin(agentPubKey: AgentPubKeyB64) {
    this._matrixStore
      .inviteToJoinGroup(this.weGroupId, decodeHashFromBase64(agentPubKey))
      .then((r) => {
        this._pubkeyField._input.value = "";
        this._inviteePubKey = undefined;

        this.success.emit({
          title: "Invitation sent!",
          msg: "Your neighbour should now have an invite in their Neighbourhood Home."
        })
      })
      .catch((e) => {
        this.danger.emit({
          title: "Error. Public key may be invalid.",
          msg: "Please check that you have copied it from the correct place!"
        })
        console.log(e);
      });
  }

  render() {
    return html`
      <nh-card .theme=${"dark"} .heading=${"Invite new neighbour"} .textSize=${"sm"}>
        <div class="content">
          <div class="input-pub-key">
            <form class="invite-form">
              <nh-text-input
                id="pubkey-field"
                .name="pubkey-field"
                .label=${""}
                .size=${"small"}
                .placeholder=${"Public Key"}
                .required=${true}
                @change=${(e) => (this._inviteePubKey = e.target.value)}
              ></nh-text-input>
              <nh-button type="submit" .variant=${"primary"} .iconImageB64=${b64images.icons.forwardArrow} @click=${() => this.inviteToJoin(this._inviteePubKey!)} .size=${"md"} .disabled=${!this._inviteePubKey}>Invite</nh-button>
            </form>
          </div>
        </div>
      </nh-card>
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-text-input": NHTextInput,
    "nh-card": NHCard,
  }

  static get styles() {
    return [
      super.styles as CSSResult,
      css`
        .content {
          max-width: 20rem;
          margin: 0 auto;
          flex-direction: column;
        }

        .invite-form {
          display: flex;
          flex-direction: row;
          gap: 1rem;
          justify-content: center;
          align-items: flex-end;
        }

        .content, .input-pub-key, .input-pub-key > *, .invite-form {
          display: flex;
        }

        nh-button {
          margin-bottom: 4px;
        }

        .content, .invite-form, .input-pub-key {
          gap: calc(1px * var(--nh-spacing-sm));
        }
    `];
  }
}

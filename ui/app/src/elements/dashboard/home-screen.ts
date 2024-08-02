import { JoinMembraneInvitation } from "@neighbourhoods/membrane-invitations";
import { consume } from "@lit/context";
import { decode } from "@msgpack/msgpack";
import { html, css, CSSResult } from "lit";
import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

import { property, query } from "lit/decorators.js";
import { CreateNeighbourhoodDialog } from "../dialogs/create-nh-dialog";
import { JoinGroupCard } from "../components/join-group-card";
import { ManagingGroupsCard } from "../components/managing-groups-card";

import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

export class HomeScreen extends NHComponent {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  @query("#we-dialog")
  _weGroupDialog!: CreateNeighbourhoodDialog;

  @query("#join-group-dialog")
  _joinGroupDialog!: any;

  weName(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).name;
  }

  weImg(invitation: JoinMembraneInvitation) {
    return (decode(invitation.clone_dna_recipe.properties) as any).logoSrc;
  }

  render() {
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <create-we-group-dialog
              id="we-dialog"
            ></create-we-group-dialog>

            <div class="column content-pane center-content">
              <managing-groups-card></managing-groups-card>
              <join-group-card ></join-group-card>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static elementDefinitions = {
    "create-we-group-dialog": CreateNeighbourhoodDialog,
    "join-group-card": JoinGroupCard,
    "managing-groups-card": ManagingGroupsCard,
  }

  static styles : CSSResult[] = [
    super.styles as CSSResult,
      css`
      .content-pane {
        display: flex;
        gap:  calc(1px * var(--nh-spacing-3xl));
        margin:  calc(1px * var(--nh-spacing-3xl));
        flex-direction: row;
        align-items: flex-start;
      }

      @media (max-width: 1024px) {
        .content-pane {
          flex-wrap: wrap;
        }
        .content-pane > * {
          justify-content: center;
          flex: 1;
        }
      }
    `
  ];
}

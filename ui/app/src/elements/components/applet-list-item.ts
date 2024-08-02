import { html, css } from "lit";
import { property } from "lit/decorators.js";
import { InstallableApplets } from "./installable-applets";
import { consume } from "@lit/context";
import { MatrixStore } from "../../matrix-store";
import { matrixContext } from "../../context";
import { AppInfo } from "@holochain/client";
import { SensemakerStore } from "@neighbourhoods/client";
import { AppletInstanceInfo } from "../../types";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHPageHeaderCard from '@neighbourhoods/design-system-components/page-header-card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';;
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { alertEvent } from "../../decorators/alert-event";

export class AppletListItem extends NHComponent {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  matrixStore!: MatrixStore;

  @alertEvent() success;
  @alertEvent() danger;
  
  @property()
  sensemakerStore!: SensemakerStore;

  @property()
  appletStatus!: string;

  @property()
  appletInfo!: AppletInstanceInfo;

  @property()
  onJoin!: () => void;

  @property()
  onReinstall!: () => void;

  @property()
  onDelete!: () => void;

  async disableApp(appInfo: AppInfo) {
    const list = (this.parentNode as any);
    this.matrixStore.disableApp(appInfo)
      .then(() => {
        this.success.emit({
          title: "Applet Disabled",
          msg: "You will no longer be able to use this applet."
        })
      }).catch((e) => {
        console.log("Error: ", e);
        this.danger.emit({
          title: "Applet Not Disabled",
          msg: "Look in the developer console for more details."
        })
      });
  }

  async enableApp(appInfo: AppInfo) {
    const list = (this.parentNode as any);
    this.matrixStore.enableApp(appInfo)
      .then(() => {
        this.success.emit({
          title: "Applet Enabled",
          msg: "You can now use this applet."
        })
      }).catch((e) => {
        console.log("Error: ", e);
        this.danger.emit({
          title: "Applet Not Enabled",
          msg: "Look in the developer console for more details."
        })
      });
  }

  renderButtons() {
    return typeof this.onJoin !== "undefined"
    ? html`
      <nh-button
        class="join-button"
        .variant=${"success"}
        .size=${"md"}
        @click=${async () => await this.onJoin()}
      >Join</nh-button>
    `
    : typeof this.onReinstall !== "undefined"
    ? html`
      <nh-button
        class="reinstall-button"
        .variant=${"warning"}
        .size=${"md"}
        @click=${async () => await this.onReinstall()}
      >Reinstall</nh-button>
    `
    : html`
      ${this.appletStatus === "RUNNING"
        ? html`
          <nh-button
            class="disable-button"
            .variant=${"warning"}
            .size=${"md"}
            @click=${async () => await this.disableApp(this.appletInfo.appInfo)}
          >Disable</nh-button>
          `
        : html`
          <nh-button
            class="start-button"
            .variant=${"success"}
            .size=${"md"}
            @click=${async () => await this.enableApp(this.appletInfo.appInfo)}
          >Start</nh-button>
        `
      }
      <nh-button
        class="delete-button"
        .variant=${"danger"}
        .size=${"md"}
        @click=${() => { this.onDelete() }}
      >Uninstall</nh-button>
    `
  }

  render() {
    return html`
      <div class="container">
        <div style="display: flex; flex: 1; align-items: center; gap: calc(1px * var(--nh-spacing-sm));">
          <img
            src=${this.appletInfo.applet.logoSrc!}
          />
          <h4>${this.appletInfo.applet.customName}</h4>
        </div>
        <div style="display: flex; flex: 3; align-items: center; gap: calc(1px * var(--nh-spacing-lg)); justify-content: flex-end;">
          <h4>${this.appletStatus}</h4>
          ${this.renderButtons()}
        </div>
      </div>
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-page-header-card": NHPageHeaderCard,
    "installable-applets": InstallableApplets,
    "nh-dialog": NHDialog,
  }

  static get styles() {
    return [
      css`
        .container {
          display: flex;
          gap: calc(1px * var(--nh-spacing-lg));
          justify-content: space-between;
        }

        img {
          height: 2rem;
          object-fit: cover;
        }

        h4 {
          color: var(--nh-theme-fg-muted);
        }
    `];
  }
}

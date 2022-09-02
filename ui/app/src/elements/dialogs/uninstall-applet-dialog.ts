import { html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  TextField,
  Button,
  Snackbar,
  Dialog,
  CircularProgress,
  TextArea,
} from "@scoped-elements/material-web";

import { sharedStyles } from "../../sharedStyles";
import { InstalledAppInfo } from "@holochain/client";

export class UninstallAppletDialog extends ScopedElementsMixin(LitElement) {


  @query("#leave-group-dialog")
  _uninstallAppletDialog!: Dialog;

  @property({ type: Object })
  installedAppInfo: InstalledAppInfo | undefined;


  open() {
    this._uninstallAppletDialog.show();
  }

  confirm() {
    this.dispatchEvent(
      new CustomEvent("confirm-uninstall", {
        detail: { installedAppInfo: this.installedAppInfo},
        composed: true,
        bubbles: true,
      })
    );
  }

  render() {
    return html`
      <mwc-dialog id="leave-group-dialog" heading="Uninstall Applet">

        Are you sure you want to uninstall this applet? This will delete all data you have stored within this applet.

        <mwc-button
          raised
          slot="secondaryAction"
          dialogAction="cancel"
          label="cancel"
        ></mwc-button>
        <mwc-button
          raised
          style="--mdc-theme-primary: #cf0000;"
          id="primary-action-button"
          slot="primaryAction"
          dialogAction="close"
          label="uninstall"
          @click=${this.confirm}
        ></mwc-button>
      </mwc-dialog>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-textfield": TextField,
      "mwc-button": Button,
      "mwc-dialog": Dialog,
      "mwc-snackbar": Snackbar,
      "mwc-circular-progress": CircularProgress,
      "mwc-textarea": TextArea,
    };
  }

  static get styles() {
    return sharedStyles;
  }
}

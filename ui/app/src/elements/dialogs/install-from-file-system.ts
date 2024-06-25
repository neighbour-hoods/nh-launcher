import { css, html, LitElement, TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { consume } from '@lit/context';
import { AppletMetaData } from '../../types';
import { StoreSubscriber } from 'lit-svelte-stores';
import { MatrixStore } from '../../matrix-store';
import { provideAllApplets } from "../../matrix-helpers";
import { matrixContext, weGroupContext } from '../../context';
import { DnaHash, EntryHash } from '@holochain/client';
import { fakeSeededEntryHash } from '../../utils';

import NHButton from '@neighbourhoods/design-system-components/button';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';

import { object, string } from 'yup';
import { alertEvent } from '../../decorators/alert-event';

export class InstallFromFsDialog extends ScopedRegistryHost(LitElement) {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false})
  weGroupId!: DnaHash;

  @state() loading!: boolean;

  @alertEvent() success;
  @alertEvent() danger;

  _allApplets = new StoreSubscriber(
    this,
    () => provideAllApplets(this._matrixStore, this.weGroupId),
    () => [this._matrixStore, this.weGroupId],
  );

  @query('nh-form') private _form;
  @query("nh-button[type='submit']") private _submitBtn;
  @query('#open-applet-dialog-button') private _openAppletDialogButton!: HTMLElement;

  // Local state for values not covered by the nh-form api:
  @state() private _duplicateName: boolean = false;
  @state() private _fileBytes: Uint8Array | undefined = undefined;
  @state() private _fakeDevhubHappReleaseHash: EntryHash | undefined = undefined;

  open() {
    this._openAppletDialogButton.click();
  }

  private resetLocalState() { this._fileBytes = undefined }

  private checkNameUniqueness(newValue: string): boolean {
    if (this._allApplets.value) {
      const allNames = this._allApplets.value!.map(
        ([_appletEntryHash, applet]) => applet.customName,
      );
      if (allNames.includes(newValue)) {
        this._duplicateName = true;
        return false
      }
    }

    this._duplicateName = false;
    return true
  }

  private async createApplet(model: any) {
    this.loading = true;
    const { applet_name, applet_description } = model;
    try {
      const appletInfo: AppletMetaData = {
        title: applet_name, // for the applet class name we just take the user defined name for now.
        subtitle: undefined,
        description: applet_description,
        devhubHappReleaseHash: this._fakeDevhubHappReleaseHash!,
        devhubGuiReleaseHash: this._fakeDevhubHappReleaseHash!, // just take the same fake hash for the GUI hash
        icon: undefined,
      };

      const appletEntryHash = await this._matrixStore.createApplet(
        this.weGroupId,
        appletInfo,
        applet_name,
        this._fileBytes, // compressed webhapp as Uint8Array
      );
      await this.updateComplete;
      this.success.emit({
        title: "Applet Installed",
        msg: "You can now use your applet, and any assessments made in it will show up on your dashboard."
      })
      
      this.dispatchEvent(
        new CustomEvent('applet-installed', {
          detail: { appletEntryHash, weGroupId: this.weGroupId },
          composed: true,
          bubbles: true,
        }),
      );
      this.loading = false;
    } catch (e) {
      this.resetLocalState()
      this.danger.emit({
        title: "Applet Could Not Be Installed",
        msg: "There was a problem installing your applet. Please check that you have a valid and functioning webhapp bundle."
      })
      this.loading = false;
      console.log('Installation error:', e);
    }
  }

  private async loadFileBytes(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.files) {
      const file = target.files.item(0);
      if (file) {
        const ab = await file.arrayBuffer()
        const ui8 = new Uint8Array(ab)
        // create a fake devhub happ release hash from the filehash --> used to compare when joining an applet
        // to ensure it is the same applet and to allow recognizing same applets across groups
        this._fakeDevhubHappReleaseHash = await fakeSeededEntryHash(ui8);
        this._fileBytes = ui8;
        console.log('fake devhub happ release hash: ', this._fakeDevhubHappReleaseHash);
      }
    }
  }

  private renderMainForm(): TemplateResult {
    return html`
      <nh-form
        .config=${(() => ({
          submitBtnRef: (() => this._submitBtn)(),
          resetOverload: this.resetLocalState,
          rows: [1, 1, 1],
          fields: [
            [
              {
                type: 'text',
                placeholder: 'Enter your applet name',
                label: 'Applet Name:',
                name: 'applet_name',
                id: 'applet-name',
                defaultValue: '',
                required: true,
                handleInputChangeOverload: async (_e, model, _fields) => {this.checkNameUniqueness.call(this, model.applet_name)},
              },
            ],
            [
              {
                type: 'textarea',
                placeholder: 'Enter a description',
                label: 'Description:',
                name: 'applet_description',
                id: 'applet-description',
                defaultValue: '',
                required: false,
              },
            ],
            [
              {
                type: 'file',
                placeholder: 'Choose File',
                label: 'Upload:',
                name: 'webhapp_file',
                id: 'webhapp-file',
                extension: '.webhapp',
                required: true,
                disabled: false,
                defaultValue: '',
                handleInputChangeOverload: this.loadFileBytes.bind(this),
              },
            ],
          ],
          submitOverload: this.createApplet.bind(this),
          schema: object({
            applet_name: string()
              .min(1, 'Must be at least 1 characters')
              .required('Enter a name for your new applet.')
              // .test('is_duplicate', 'This name has already been used', () => !this._duplicateName)
              ,
            applet_description: string(),
            webhapp_file: string()
              .min(1, 'Your webhapp bundle have a valid path.')
              .required('Add a webhapp bundle')
          }),
        }))()}
      >
      </nh-form>
    `;
  }

  render() {
    return this.loading
      ? html`<nh-spinner type=${"page"}></nh-spinner>`
      : html`
        <button id="open-applet-dialog-button" style="opacity:0" type="button"></button>
        <nh-dialog
          .handleClose=${() => {this.resetLocalState.call(this); this._form.reset()}}
          id="applet-dialog"
          size="medium"
          .dialogType=${'applet-install'}
          .title=${"Install Applet"}
          .openButtonRef=${this._openAppletDialogButton}
        >
          <div slot="inner-content" class="container">
            ${this.renderMainForm()}
          </div>

          <nh-button
            slot="primary-action"
            type="submit"
            id="install-applet"
            .variant=${'primary'}
            .size=${'md'}
          >Install</nh-button>
        </nh-dialog>
      `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-dialog': NHDialog,
    'nh-form': NHForm,
    "nh-spinner": NHSpinner,
  }

  static get styles() {
    return css`
      :host {
        display: flex;
      }
      .container {
        padding: 0.5rem;
        display: flex;
        flex: 1;
        flex-direction: column;
        align-items: start;
        justify-content: space-between;
        gap: calc(1px * var(--nh-spacing-md));
        width: fit-content;
        margin: 0 auto;
        overflow: auto !important;
        color: var(--nh-theme-fg-on-dark);
      }
      nh-form {
        padding-bottom: 2rem;
      }
      @media (max-height: 767px) {
        .column {
          flex-basis: 400%;
          padding-left: calc(1px * var(--nh-spacing-xl));
        }
      }
    `;
  }
}

import { css, CSSResult, html, PropertyValueMap, TemplateResult } from "lit";
import { property, query, queryAll, state } from "lit/decorators.js";

import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHButton from '@neighbourhoods/design-system-components/button';
import NHButtonGroup from '@neighbourhoods/design-system-components/button-group';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import CreateOrEditTrayConfig from '../forms/create-edit-assessment-tray';
import AssessmentTrayConfigList from '../lists/assessment-tray-config-list';
import { SensemakerStore, AssessmentTrayConfig } from "@neighbourhoods/client";
import { b64images } from "@neighbourhoods/design-system-styles";
import { consume } from "@lit/context";
import { appletInstanceInfosContext } from "../../context";
import { StoreSubscriber } from "lit-svelte-stores";
import { derived } from "svelte/store";

export default class AssessmentTrayConfigs extends NHComponent {
  @property() loaded: boolean = false;

  @query('nh-dialog')
  private _dialog;
  @query('assessment-tray-config-list')
  private _list;

  @property()
  createTrayConfigDialogButton!: HTMLElement;

  @property()
  sensemakerStore!: SensemakerStore;

  @consume({ context: appletInstanceInfosContext })
  @property({attribute: false}) _currentAppletInstances;

  // Asssessment/Resource renderer dictionary, keyed by Applet EH
  @state() _appletInstanceRenderers : StoreSubscriber<any> = new StoreSubscriber(
    this,
    () =>  derived(this._currentAppletInstances.store, (appletInstanceInfos: any) => {
      //@ts-ignore
      return !!appletInstanceInfos && Object.values(appletInstanceInfos).some(appletInfo => appletInfo!.gui)
      //@ts-ignore
        ? Object.fromEntries((Object.entries(appletInstanceInfos) || [])?.map(([appletEh, appletInfo]) => {
          if(typeof appletInfo?.gui == 'undefined') return;
          return [appletEh, {...(appletInfo as any)?.gui?.resourceRenderers, ...(appletInfo as any).gui.assessmentControls}]
        }).filter(value => !!value) || [])
        : null
    }),
    () => [this.loaded],
  );

  render(): TemplateResult {
    return html`
      <div class="container">
        <nh-page-header-card .heading=${'Assessment Tray Configurations'}>
          <nh-button
            slot="secondary-action"
            .variant=${'neutral'}
            .size=${'icon'}
            .iconImageB64=${b64images.icons.backCaret}
            @click=${() => this.onClickBackButton()}
          >
          </nh-button>
        </nh-page-header-card>

        <nh-dialog
          @assessment-widget-config-set=${async(e: CustomEvent) => { 
            this._dialog.isOpen = false;
            this._dialog._dialog.hide();
            await this._list.fetchAssessmentTrayEntries()
            await this._list.updateComplete;
            this.requestUpdate()
            await this.updateComplete;
          }}
          id="dialog"
          class="no-title"
          .dialogType=${"input-form"}
          .title="Create Assessment Tray Config"
          .handleOk=${() => {}}
          size=${"large"}
          .openButtonRef=${(() => this.createTrayConfigDialogButton)()}
        >
          <div slot="inner-content" class="row">
            <create-or-edit-tray
              .sensemakerStore=${this.sensemakerStore}
            >
            </create-or-edit-tray>
          </div>

          <div slot="primary-action">
          </div>
        </nh-dialog>
        <assessment-tray-config-list
          .sensemakerStore=${this.sensemakerStore}
        >
          <nh-button
            slot="action-button"
            @click=${() => this._dialog.showDialog()}
            class="create-config"
            .variant=${"primary"}
            .iconImageB64=${b64images.icons.plus}
            .size=${"md"}
          >Add</nh-button>
        </assessment-tray-config-list>
      </div>
    `;
  }

  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-button-group': NHButtonGroup,
    'nh-card': NHCard,
    'nh-form': NHForm,
    'nh-dialog': NHDialog,
    'assessment-tray-config-list': AssessmentTrayConfigList,
    'create-or-edit-tray': CreateOrEditTrayConfig,
  };

  private onClickBackButton() {
    this.dispatchEvent(new CustomEvent('return-home', { bubbles: true, composed: true }));
  }

  static styles: CSSResult[] = [
    ...super.styles as CSSResult[],
    css`
      /* Layout */
      :host {
        width: 100%;
        height: 100%;
      }

      div.container {
        width: 100%;
        display: flex;
        color: var(--nh-theme-fg-default);
        gap: calc(1px * var(--nh-spacing-sm));
        flex-direction: column;  
        padding: calc(1px * var(--nh-spacing-xl));
        box-sizing: border-box;
      }

      div.tray-name-field {
        width: 18rem;
        margin: 0 auto 1rem auto;
      }

      nh-page-header-card {
        grid-column: 1 / -1;
      }

      .description {
        text-align: center;
      }

      /* Typo */
      h2 {
        text-align: center;
        margin: 0 auto;
        width: 18rem;
      }

      /* Top of the page display for current widget config with create/update actions */
      .widget-block-config {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-around;
        width: 100%;
      }

      /* Form actions */
      .action-buttons {
        position: absolute;
        right: calc(1px * var(--nh-spacing-xl));
        bottom: calc(1px * var(--nh-spacing-xs));
      }

      /* Form layout */
      nh-form {
        display: flex;
        max-width: initial !important;
        min-height: 5rem;
      }

      .add-assessment-icon {
        height: 32px;
        width: 32px;
        margin: 4px;
        padding: 0px;
        border-radius: calc(1px * var(--nh-radii-xl));
        background-color: var(--nh-theme-accent-default);
      }

      .add-assessment-icon:hover {
        background-color: var(--nh-theme-accent-emphasis);
        cursor: pointer;
      }

      @media (min-width: 1350px) {
        form {
          flex-wrap: nowrap;
          padding-bottom: 0;
          margin-bottom: 0;
        }
        :host {
          overflow: hidden;
        }
      }
  `];


  async fetchExistingTrayConfig() : Promise<AssessmentTrayConfig | undefined> {
    if (!this.sensemakerStore || !this.resourceDef) return;
    const defaultConfig = await this.sensemakerStore.getDefaultAssessmentTrayForResourceDef(
      this.resourceDef?.resource_def_eh,
    );
    return defaultConfig?.entry
  }
}

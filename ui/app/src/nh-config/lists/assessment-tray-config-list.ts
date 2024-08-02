import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { EntryHash, EntryHashB64 } from "@holochain/client";
import { AssessmentTrayConfig, SensemakerStore, ResourceBlockRenderer, DimensionControlMapping } from "@neighbourhoods/client";
import { FakeInputAssessmentControlDelegate, InputAssessmentRenderer } from "@neighbourhoods/app-loader";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHAssessmentContainer from '@neighbourhoods/design-system-components/widgets/assessment-container';
import NHResourceAssessmentTray from '@neighbourhoods/design-system-components/widgets/resource-assessment-tray';

import { repeat } from "lit/directives/repeat.js";
import { consume } from "@lit/context";
import { appletInstanceInfosContext } from "../../context";
import { StoreSubscriber } from "lit-svelte-stores";
import { derived } from "svelte/store";

export default class AssessmentTrayConfigList extends NHComponent {  
  @property() sensemakerStore!: SensemakerStore;

  @property() loaded: boolean = false;

  @state() private _assessmentTrayEntries!: Array<AssessmentTrayConfig & { assessment_tray_eh: EntryHash }>;

  @consume({ context: appletInstanceInfosContext })
  @property({attribute: false}) _currentAppletInstances;

  // Asssessment/Resource renderer dictionary, keyed by Applet EH
  @state() _appletInstanceRenderers : StoreSubscriber<any> = new StoreSubscriber(
    this,
    () =>  derived(this._currentAppletInstances.store, (appletInstanceInfos: any) => {
      //@ts-ignore
      console.log('appletInstanceInfos :>> ', appletInstanceInfos);
      return !!appletInstanceInfos && Object.values(appletInstanceInfos).some(appletInfo => appletInfo!.gui)
      //@ts-ignore
        ? Object.fromEntries((Object.entries(appletInstanceInfos) || [])?.map(([appletEh, appletInfo]) => {
          if(typeof appletInfo?.gui == 'undefined') return;
          return [appletEh, {...(appletInfo as any)?.gui?.resourceRenderers, ...(appletInfo as any).gui.assessmentControls}]
        }).filter(value => !!value) || [])
        : null
    }),
    () => [this.loaded, this._currentAppletInstances, this._assessmentTrayEntries],
  );

  async fetchAssessmentTrayEntries() {
    try {
      const entryRecords = await this.sensemakerStore.getAssessmentTrayConfigs();

      this._assessmentTrayEntries = entryRecords.map(entryRecord => {
        return {
          ...entryRecord.entry,
          assessment_tray_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching assessment trays: ', error);
    }
  }

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if (!!this.sensemakerStore) {
      await this.fetchAssessmentTrayEntries();
    }
  }

  render() {
    const allRenderableAppletWidgets = this._appletInstanceRenderers?.value
      ? Object.values(this._appletInstanceRenderers.value).flatMap(renderers => Object.values(renderers as any)) as (DimensionControlMapping | ResourceBlockRenderer)[]
      : []

    return html`
      <div class="content">
        <div class="title-bar">
          <h1>Assessment Trays</h1>
          <slot class="action" name="action-button"></slot>
        </div>  
        ${this._assessmentTrayEntries && this._assessmentTrayEntries.length > 0
          ? html`${repeat(this._assessmentTrayEntries, (entry) => entry.name, (entry, _idx) => html`
              <div style="display:flex; justify-content: space-between; align-items: center;">  
                <p style="flex: 2">${entry.name}</p>
                <nh-assessment-tray
                  style="flex: 3"
                  .editable=${false}
                  .editing=${false}
                >
                  <div slot="widgets">
                    ${entry.assessmentControlConfigs.map(config => 
                      { 
                        const component = allRenderableAppletWidgets.find(control => control.name == config.inputAssessmentControl.componentName)?.component;
                        if(!component) return null;
                        return html`
                          <nh-assessment-container>
                            <input-assessment-renderer slot="assessment-control"
                              .component=${component}
                              .nhDelegate=${new FakeInputAssessmentControlDelegate()}
                            ></input-assessment-renderer>
                          </nh-assessment-container>
                        `
                      }
                    )}
                  </div>
                  </nh-assessment-tray>
                  <nh-button
                    .variant=${"primary"}
                    .size=${"md"}
                    style="display:flex; flex: 1"
                    @click=${() => {
                      const assessmentTrayConfigEh = entry.assessment_tray_eh;
                      this.dispatchEvent(
                        new CustomEvent('edit-assessment-tray', {
                          detail: assessmentTrayConfigEh,
                          bubbles: true,
                          composed: true,
                        }),
                      );
                    }}>Edit
                  </nh-button>
                </div>
              `
          )}`
          : 'No trays have been created'
        }
      </div>
    `;
  }

  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-card": NHCard,
    'input-assessment-renderer': InputAssessmentRenderer,
    'nh-assessment-container': NHAssessmentContainer,
    'nh-assessment-tray': NHResourceAssessmentTray,
  }

  static get styles() {
    return css`
      .title-bar {
        display: flex;
        justify-content: flex-end;
        align-items: center;
      }

      h1 {
        display: flex;
        margin-right: calc(1px * var(--nh-spacing-xl));
      }

      .action {
        display: flex;
        flex: 1;
      }

      :host {
        display: flex;
        flex: 1;
        justify-content: center;
        align-items: center;
      }
  
      .content{
        width: 100%;
      }
    `;
  }
}
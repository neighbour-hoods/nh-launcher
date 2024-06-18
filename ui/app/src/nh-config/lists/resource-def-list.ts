import { html, css, PropertyValueMap } from "lit";
import { property, state } from "lit/decorators.js";

import { AssessmentTrayConfig, ResourceDef, SensemakerStore, serializeAsyncActions } from "@neighbourhoods/client";

import NHButton from '@neighbourhoods/design-system-components/button';
import NHSelect from '@neighbourhoods/design-system-components/input/select';
import NHButtonGroup from '@neighbourhoods/design-system-components/button-group';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHCardList from '@neighbourhoods/design-system-components/card-list';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { EntryRecord } from "@holochain-open-dev/utils";
import { EntryHash } from "@holochain/client";

export default class ResourceDefList extends NHComponent {
  @property() sensemakerStore!: SensemakerStore;

  @state() private _resourceDefEntries: Array<ResourceDef & { resource_def_eh: EntryHash }> = [];

  @state() private _assessmentTrayEntries!: Array<AssessmentTrayConfig & { assessment_tray_eh: EntryHash }>;

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

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    const result = await this.sensemakerStore.getResourceDefs()
    const destructuredEntryRecords = result?.map((eR: EntryRecord<ResourceDef>) => ({...eR.entry, resource_def_eh: eR.entryHash}))
    this._resourceDefEntries = destructuredEntryRecords || []

    await this.fetchAssessmentTrayEntries();
  }

  protected async updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    if(changedProperties.has("_resourceDefEntries") && this._resourceDefEntries.length > 0) {
      try {
        const fetchDefaultActions: Array<()=>Promise<EntryRecord<AssessmentTrayConfig> | null>> = [];
        this._resourceDefEntries.forEach(rd => {
          fetchDefaultActions.push(async() => {
            const maybeDefaultTrayConfig = await this.sensemakerStore.getDefaultAssessmentTrayForResourceDef(rd.resource_def_eh)
            console.log('maybeDefaultTrayConfig for ' + rd.resource_name + ':>> ', maybeDefaultTrayConfig);
            return maybeDefaultTrayConfig
          })
        })
        serializeAsyncActions(fetchDefaultActions);
      } catch (e) {
        console.error(e)
      }
    }
  }

  render() {
    return html`
      <nh-button-group class="content"  .direction=${"vertical"}
        .fixedFirstItem=${true}
        .addItemButton=${true}
      >
        <nh-card-list
          class="nested"
          slot="buttons"
          .type=${"linear"}
          .direction=${"vertical"}
        >
          ${
            this._resourceDefEntries.map((resourceDef: ResourceDef & { resource_def_eh: EntryHash }) => html`
              <nh-card
                .theme=${'dark'}
                .textSize=${"md"}
                .title=${resourceDef['resource_name']?.split("_").join(" ").toUpperCase()}
              >
                <nh-select
                  .errored=${false}
                  .size=${"md"}
                  .required=${false}
                  .id=${resourceDef + "-set-tray-default"}
                  .name=${resourceDef + "-set-tray-default"}
                  .placeholder=${"Set default tray config"}
                  .label=${"Pick default tray:"}
                  @change=${async(e: Event) => {
                    const defaultTrayEntryHash = (e.target as any)?.value;
                    if(!defaultTrayEntryHash) return;

                    try {
                      const setDefaultResult = await this.sensemakerStore.setDefaultAssessmentTrayForResourceDef(resourceDef.resource_def_eh, defaultTrayEntryHash);
                      console.log('setDefaultResult :>> ', setDefaultResult);
                      await this.updateComplete;
                      this.dispatchEvent(
                        new CustomEvent("trigger-alert", {
                          detail: { 
                            title: "Default Tray Updated",
                            msg: "You have linked the Resource Definition to a default Assessment Tray configuration",
                            type: "success",
                            closable: true,
                          },
                          bubbles: true,
                          composed: true,
                        })
                      );
                    } catch (error) {
                      console.log("Failed to set default tray for resource def: ", error)
                    }
                  }}
                  .options=${this._assessmentTrayEntries?.map(trayEntry => ({
                      label: trayEntry.name,
                      value: trayEntry.assessment_tray_eh
                  }))}
                >
                </nh-select>
              </nh-card>
            `)
          }
        </nh-card-list>
      </nh-button-group>
    `;
  }


  static elementDefinitions = {
    "nh-button": NHButton,
    "nh-select": NHSelect,
    "nh-button-group": NHButtonGroup,
    "nh-card": NHCard,
    "nh-card-list": NHCardList
  }

  static get styles() {
    return css`
      .content{
        width: 100%;
      }
    `;
  }
}

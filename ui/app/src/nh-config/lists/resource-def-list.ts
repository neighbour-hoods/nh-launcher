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

  @state() private _resourceDefEntries: Array<ResourceDef & { resource_def_eh: EntryHash, tray_config_eh?: EntryHash }> = [];

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    const result = await this.sensemakerStore.getResourceDefs()
    const destructuredEntryRecords = result?.map((eR: EntryRecord<ResourceDef>) => ({...eR.entry, resource_def_eh: eR.entryHash}))
    this._resourceDefEntries = destructuredEntryRecords || []
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
            this._resourceDefEntries.map((resourceDef: ResourceDef) => html`
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
                  @change=${(e: Event) => {}}
                  .options=${[]}
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

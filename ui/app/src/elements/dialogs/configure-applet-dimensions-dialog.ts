import { html, css, CSSResult, PropertyValueMap} from "lit";
import { property, query, state } from "lit/decorators.js";

import { NHComponentShoelace, NHDialog, NHForm } from "@neighbourhoods/design-system-components";
import { ConfigDimensionList } from "../../nh-config";
import { AppletConfigInput, Dimension, SensemakerStore } from "@neighbourhoods/client";
import { DnaHash, EntryHash } from "@holochain/client";
import { StoreSubscriber } from "lit-svelte-stores";
import { MatrixStore } from "../../matrix-store";
import { consume } from "@lit/context";
import { matrixContext, weGroupContext } from "../../context";

export class ConfigureAppletDimensions extends NHComponentShoelace {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false}) _matrixStore!: MatrixStore;

  @consume({ context: weGroupContext, subscribe: true })
  @property({attribute: false}) weGroupId!: DnaHash;

  _sensemakerStore = new StoreSubscriber(this, () =>
    this._matrixStore?.sensemakerStore(this.weGroupId),
  );

  @property() handleSubmit!: Function;
  @property() config!: AppletConfigInput;

  @query('nh-dialog') dialog!: NHDialog;

  @state() private _existingDimensionEntries!: Array<Dimension & { dimension_eh: EntryHash }>;

  render() {
    return html`
      <nh-dialog
        id="dialog"
        .dialogType=${"dimension-config"}
        .size=${"large"}
        .title=${"Configuring Dimensions"}
        .handleOk=${this.handleSubmit}
      >
        <div slot="inner-content" class="dialog-container">
          <h1>Add Applet's Dimensions</h1>
          ${ this.config 
              ? html`
                      <config-dimension-list
                        id="applet-input-dimension-list"
                        .dimensionType=${'input'}
                        .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => !dimension.computed)}
                        .configMethods=${(this.config as AppletConfigInput)!.methods}
                      >
                      </config-dimension-list>
                      <config-dimension-list
                        id="applet-output-dimension-list"
                        .dimensionType=${'output'}
                        .configDimensions=${(this.config as AppletConfigInput)!.dimensions!.filter(dimension => dimension.computed)}
                        .configMethods=${(this.config as AppletConfigInput)!.methods}
                      >
                      </config-dimension-list>
                  `
              : html`No config!` // Need to add loading spinner instead?
            } 
        </div>
      </nh-dialog>
    `;
  }

  async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    await this.fetchDimensionEntries();
  }

  async fetchDimensionEntries() {
    try {
      const entryRecords = await this._sensemakerStore.value?.getDimensions();
      this._existingDimensionEntries = entryRecords!.map(entryRecord => {
        return {
          ...entryRecord.entry,
          dimension_eh: entryRecord.entryHash
        }
      })
    } catch (error) {
      console.log('Error fetching dimension details: ', error);
    }
  }

  static elementDefinitions = {
    'nh-dialog' : NHDialog,
    'nh-form' : NHForm,
    'config-dimension-list' : ConfigDimensionList
  }

  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        config-dimension-list {
          width: 100%;
        }

        h1 {
          color: white;
          margin: 0 auto;
          font-size: calc(1px * var(--nh-font-size-4xl));
        }
        
        .dialog-container {
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
        }

        h2 {
          color: white;
          margin: 0 auto;
          width: 18rem;
        }
      `,
    ];
}

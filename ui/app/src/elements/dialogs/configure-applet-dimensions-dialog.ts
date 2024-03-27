import { html, css, CSSResult} from "lit";
import { property, query } from "lit/decorators.js";

import { NHComponentShoelace, NHDialog, NHForm } from "@neighbourhoods/design-system-components";
import { ConfigDimensionList } from "../../nh-config";
import { AppletConfigInput } from "@neighbourhoods/client";

export class ConfigureAppletDimensions extends NHComponentShoelace {
  @query('nh-dialog') dialog!: NHDialog;

  @property() handleSubmit!: Function;
  @property() config!: AppletConfigInput;

  render() {
    return html`
      <nh-dialog
        id="dialog"
        .dialogType=${"widget-config"}
        .size=${"large"}
        .title="Configure Applet Dimensions"
        .handleOk=${this.handleSubmit}
      >
        <div slot="inner-content" class="dialog-container">
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

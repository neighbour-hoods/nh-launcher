import { html, css, CSSResult} from "lit";
import { property, query } from "lit/decorators.js";

import { NHComponentShoelace, NHDialog, NHForm } from "@neighbourhoods/design-system-components";
import { DimensionList } from "../../nh-config";
import { Dimension } from "@neighbourhoods/client";

export class ConfigureAppletDimensions extends NHComponentShoelace {
  @query('nh-dialog') dialog!: NHDialog;

  @property() handleSubmit!: Function;
  @property() existingDimensions!: Array<Dimension>;

  render() {
    return html`
      <nh-dialog
        id="dialog"
        dialogType="input-form"
        title="Configure Applet Dimensions"
        .handleOk=${this.handleSubmit}
      >
        <div slot="inner-content" class="dialog-container">
          ${ this.existingDimensions && this.existingDimensions.length > 0 
              ? html`<h2>
                      ${'Configure Applet Dimensions'}
                    </h2>
                    <dimension-list
                      id="applets-dimension-list"
                      .dimensionType=${'input'}
                      .existingDimensionEntries=${this.existingDimensions}
                    >
                    </dimension-list>
                  `
              : html`No dimensions!` // Need to add loading spinner instead?
            } 
        </div>
      </nh-dialog>
    `;
  }

  static elementDefinitions = {
    'nh-dialog' : NHDialog,
    'nh-form' : NHForm,
    'dimension-list' : DimensionList
  }

  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
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

import { html, css, CSSResult} from "lit";
import { state, property, query } from "lit/decorators.js";

import { consume } from "@lit/context";

import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";

import NHTextInput from '@neighbourhoods/design-system-components/input/text';
import NHSelectAvatar from '@neighbourhoods/design-system-components/select-avatar';
import NHDialog from '@neighbourhoods/design-system-components/dialog';
import NHTooltip from '@neighbourhoods/design-system-components/tooltip';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { b64images } from "@neighbourhoods/design-system-styles";

import { InferType, object, string } from "yup";
import { alertEvent } from "../../decorators/alert-event";

const NH_DEFAULT_LOGO = b64images.nhIcons.logoCol;

export class CreateNeighbourhoodDialog extends NHComponent {
  @consume({ context: matrixContext , subscribe: true })
  @property({attribute: false})
  _matrixStore!: MatrixStore;

  _neighbourhoodSchema = object({
    name: string().min(3, "Must be at least 3 characters").required(),
    image: string(),
  });

  _neighbourhood: InferType<typeof this._neighbourhoodSchema> = { name: "", image: "" };

  @property() openDialogButton!: HTMLElement;
  @alertEvent() danger;
  @query("nh-text-input") _nhInput;
  @state() validName: boolean = true; // Emulates 'touched = false' initial state

  async reset() {
    this._neighbourhood.name = "";
    this._neighbourhood.image = "";
    this.validName = true;
    this._nhInput._input.value = "";
    await this._nhInput.requestUpdate()
    await this._nhInput.updateComplete;
  }

  private async onSubmit(e: any) {
    const root = this.renderRoot;
    if(!this._neighbourhood.image) {
      this._neighbourhood.image = `data:image/svg+xml;base64,${NH_DEFAULT_LOGO}`
    }
    this._neighbourhoodSchema.validate(this._neighbourhood)
      .then(async valid => {
        this.dispatchEvent(new CustomEvent("creating-we", {})); // required to display loading screen in the dashboard
        const weId = await this._matrixStore.createWeGroup(this._neighbourhood.name!, this._neighbourhood.image!);

        await this.reset();
        await this.requestUpdate();
        await this.updateComplete;
        this.dispatchEvent(
          new CustomEvent("we-added", {
            detail: weId,
            bubbles: true,
            composed: true,
          })
        );
      })
      .catch((err) => {
        const dialog = (root.querySelector("nh-dialog") as any).renderRoot.querySelector('sl-dialog');
        dialog.show() // Stop dialog from closing
        this.danger.emit({
          title: "Invalid Input",
          msg: "Try filling out the form again!"
        })

        console.log("Error validating profile for field: ", err.path);
      })
  }

  render() {
    console.log('object :>> ', this._neighbourhood);
    return html`
      <nh-dialog
        id="dialog"
        class="no-title"
        .dialogType=${"create-neighbourhood"}
        .title="Create Neighbourhood"
        .handleOk=${this.onSubmit.bind(this)}
        .handleClose=${this.reset.bind(this)}
        .size=${"medium"}
        .openButtonRef=${this.openDialogButton}
        .primaryButtonDisabled=${!this._neighbourhoodSchema.isValidSync(this._neighbourhood)}
      >
        <div slot="inner-content" class="row">
          <nh-tooltip .visible=${!this.validName} .text=${"Your Neighbourhood name should be at least 3 characters"} .variant=${"danger"}>
            <nh-text-input
              slot="hoverable"
              .errored=${!this.validName}
              .size=${"medium"}
              .label=${"Neighbourhood Name"}
              .name=${"neighbourhood-name"}
              .placeholder=${"Enter a name"}
              .required=${true}
              .value=${this._neighbourhood.name}
              @change=${(e: CustomEvent) => this.handleNameChange(e)}
            ></nh-text-input>
          </nh-tooltip>

          ${this._neighbourhood.image 
            ? html`<img class="nh-avatar" src="${this._neighbourhood.image}" />`
            : html`<nh-select-avatar
              slot="hoverable"
              id="select-avatar"
              .defaultTooltip=${"NH Image"}
              .shape=${'circle'}
              .label=${"Image"}
              .size=${"lg"}
              .value=${this._neighbourhood.image}
              @change=${(e: CustomEvent) => this.handleImageChange(e)}
              .defaultValue=${NH_DEFAULT_LOGO}
            ></nh-select-avatar>`}
        </div>
      </nh-dialog>
    `;
  }

  private nameIsValid() : boolean {
    let isValid;
    try {
      isValid = !!(this._neighbourhoodSchema.validateSyncAt("name", {"name": this._neighbourhood.name}));
    } catch (error) {
      isValid = false;
    }
    return isValid
  }

  private async handleImageChange(e) {
    this._neighbourhood.image = e.target.value;
    this.requestUpdate();
  }


  private async handleNameChange(e) {
    this._neighbourhood.name = e.target.value;
    this.validName = await this.nameIsValid()
    this.requestUpdate();
  }

  static elementDefinitions = {
    "nh-select-avatar": NHSelectAvatar,
    "nh-tooltip": NHTooltip,
    "nh-text-input": NHTextInput,
    'nh-dialog' : NHDialog
  }

  static styles : CSSResult[] = [
      super.styles as CSSResult,
      css`
        .nh-avatar {
          position: relative;
          left: 1rem;  
          border-radius: 1rem;
          width: 4rem;
          top: 1rem;  
        }
        .row {
          min-height: 8rem;
          align-items: center;
          justify-content: center;
        }
      `,
    ];
}

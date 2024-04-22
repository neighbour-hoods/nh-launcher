import { CSSResult, TemplateResult, css, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { NHComponent } from "./ancestors/base";
import { SlAvatar } from "@shoelace-style/shoelace";
import NHButton from "./button";
import { classMap } from "lit/directives/class-map.js";
import NHTooltip from "./tooltip";

export default class NHSelectAvatar extends NHComponent {
  @property() name : string = "avatar";
  @property() label : string = "Avatar";

  @property() size! : "sm" | "md" | "lg";
  @property() shape : "circle" | "rounded" | "square" = "circle";

  @property() disabled : boolean = false;
  @property() errored : boolean = false;
  @property() required : boolean = false;

  @property() customPlaceholder!: string;
  @state() value!: string | undefined;

  @query("#avatar-file-picker") _avatarFilePicker!: any;

  async onAvatarUploaded() {
    if (this._avatarFilePicker.files && this._avatarFilePicker.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          this.value = resizeAndExport(img);
          this._avatarFilePicker.value = "";
        };
        img.src = e.target?.result as string;
        this.dispatchEvent(
          new CustomEvent("avatar-selected", {
            composed: true,
            bubbles: true,
            detail: {
              avatar: img.src,
            },
          })
        );
      };
      reader.readAsDataURL(this._avatarFilePicker.files[0]);
    }
  }

  async handleInputChange(e: Event) {
    await this.onAvatarUploaded()
    await this.updateComplete;
    setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent("change", {
          detail: {
            value: this.value
          },
          bubbles: true,
          composed: true,
        })
      );
    }, 100);
  }

  render(): TemplateResult {
    return html` <div
      class="field ${classMap({
        ["errored"]: !!this.errored,
        [this.size]: !!this.size,
        ["disabled"]: !!this.disabled,
      })}"
    >
      <input
        type="file"
        name="avatar"
        id="avatar-file-picker"
        style="display: none"
        @change=${this.handleInputChange}
      />
      ${this.label
        ? html`<div class="row">
            <label for=${this.name}>${this.label}</label>

            ${this.required
              ? html`<label
                  class="reqd"
                  for=${this.name}
                  name=${this.name}
                  data-name=${this.name}
                  >⁎</label
                >`
              : null}
          </div>`
        : null}
      <div class="row">
      ${this.value
        ? html`<span
            @click=${() => {
              this.value = undefined;
            }}
          >
            <nh-tooltip .text=${"Clear"} .variant=${"neutral"}>
              <sl-avatar style="--sl-border-radius-medium: 1rem; --sl-border-radius-circle: ${
                this.shape == "circle" ? "100%" : ""
              }"
                slot="hoverable"
                name=${this.name}
                image=${this.value}
                .shape=${this.shape}
              ></sl-avatar
            ></nh-tooltip>
          </span>`
        : html`<nh-button
            .size=${this.size}
            .disabled=${this.disabled}
            .variant=${"icon"}
            .iconImageB64=${this.customPlaceholder || "PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTUiIHZpZXdCb3g9IjAgMCA1NiA1NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMC41IiB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHJ4PSIyNy41IiBmaWxsPSIjNDMzQTRBIi8+CjxtYXNrIGlkPSJtYXNrMF8xMTMzXzk1NDAiIHN0eWxlPSJtYXNrLXR5cGU6YWxwaGEiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjAiIHk9IjAiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NSI+CjxyZWN0IHg9IjAuNSIgd2lkdGg9IjU1IiBoZWlnaHQ9IjU1IiByeD0iMjcuNSIgZmlsbD0iIzQzM0E0QSIvPgo8L21hc2s+CjxnIG1hc2s9InVybCgjbWFzazBfMTEzM185NTQwKSI+CjxyZWN0IHg9IjAuNDE2NTA0IiB3aWR0aD0iNTUiIGhlaWdodD0iNTUiIHJ4PSIyNy41IiBmaWxsPSIjMjUxRjI4Ii8+CjxyZWN0IHg9Ii0xMS41IiB5PSIzNS4wODM1IiB3aWR0aD0iNzguODMzMyIgaGVpZ2h0PSI3OC44MzMzIiByeD0iMzkuNDE2NyIgZmlsbD0iI0ExNzlGRiIvPgo8cmVjdCB4PSIxNC4xNjY1IiB5PSI5LjQxNjUiIHdpZHRoPSIyNy41IiBoZWlnaHQ9IjI3LjUiIHJ4PSIxMy43NSIgZmlsbD0iI0ExNzlGRiIvPgo8L2c+Cjwvc3ZnPgo="}
            @click=${() => this._avatarFilePicker.click()}
          ></nh-button>`}
        </div>
      </div>
    `;
  }

  static elementDefinitions = {
    "nh-tooltip": NHTooltip,
    "sl-avatar": SlAvatar,
    "nh-button": NHButton,
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      .field {
        gap: .5rem;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }
      .field.md sl-avatar {
        transform: scale(1.2);
      }
      .field.lg sl-avatar {
        transform: scale(1.4);
      }
      .field {
        height: auto;
        width: 4rem;
      }
      .field.md {
        height: 5rem;
        width: 5rem;
      }
      .field.lg {
        height: 6rem;
        width: 6rem;
      }

      /* Labels */
      
      label {
        padding: 0;
      }
    
      label.reqd {
        height: 100%;
        align-items: center;
        padding-left: 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default);
      }

      /* Typo */

      label:not(.reqd) {
        font-size: calc(1px * var(--nh-font-size-base));
        font-family: var(--nh-font-families-body);
        font-weight: var(--nh-font-weights-body-regular);
        line-height: normal;
        color: var(--nh-theme-fg-default);
      }

      /* Error state */
      .field.errored sl-avatar::part(base) {
        outline: 2px solid var(--nh-theme-error-default, #E95C7B);
      }

      /* Disabled state */
      .field.disabled sl-avatar::part(base) {
        background-color: var(--nh-theme-input-fg-disabled); 
        border-color: var(--nh-theme-input-border-disabled);
      }
      .field.disabled:hover sl-avatar::part(base) {
        background: var(--nh-theme-input-fg-disabled);
        border-color: var(--nh-theme-input-border-disabled);
        cursor: not-allowed;
      }
    `,
  ];
}

function resizeAndExport(img: any) {
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 300;
  let width = img.width;
  let height = img.height;
  // Change the resizing logic
  if (width > height) {
    if (width > MAX_WIDTH) {
      height = height * (MAX_WIDTH / width);
      width = MAX_WIDTH;
    }
  } else {
    if (height > MAX_HEIGHT) {
      width = width * (MAX_HEIGHT / height);
      height = MAX_HEIGHT;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx!.drawImage(img, 0, 0, width, height);
  // return the .toDataURL of the temp canvas
  return canvas.toDataURL();
}

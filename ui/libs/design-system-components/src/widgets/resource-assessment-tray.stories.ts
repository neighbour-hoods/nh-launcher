import ResourceAssessmentTray from "./resource-assessment-tray";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHComponent } from "../ancestors/base";
import NHAssessmentContainer from "./assessment-container";
import NHIconContainer from "./icon-container";
import { property } from "lit/decorators.js";

class TestRoot extends NHComponent {
  @property()
  editable: boolean = false;

  @property()
  editing: boolean = false;

  @property()
  controls: [] = []

  static elementDefinitions = {
    "assessment-container": NHAssessmentContainer,
    "resource-assessment-tray": ResourceAssessmentTray,
    "nh-icon": NHIconContainer
  };

  render() {
    return html`<resource-assessment-tray
      .editable=${this.editable}
      .editing=${this.editing}
      >
      <div slot="widgets">
        ${this.controls?.map(({value, icons, selected, edit} : any) => html`
        <assessment-container .selected=${selected} .editMode=${edit}>
          <span slot="assessment-output">${value}</span>
          <span slot="assessment-control">
            <!-- Normally, this would be a control. Here it is mocked poorly. -->
            ${icons.map(icon => html`<nh-icon>${icon}</nh-icon>`)}
          </span>
        </assessment-container>`)}
      </div>
    </resource-assessment-tray>`;
  }
}

customElements.define("assessment-tray--test-root", TestRoot);

const meta: Meta<any> = {
  title: "NHComponent/Widgets/ResourceAssessmentTray",
  component: "assessment-tray--test-root",
  argTypes: {},
  parameters: {
    backgrounds: { default: "surface" },
  },
  render: (args) => html`<assessment-tray--test-root .editable=${args.editable} .editing=${args.editing} .controls=${args.controls} />`,
};

export default meta;

type Story = StoryObj<any>;


export const Empty: Story = {
  args: {
    editing: false,
    controls: [
      { value: 0,
        icons: [
          ''
        ]
      },
    ]
  },
};

export const Full2: Story = {
  args: {
    editing: false,
    controls: [
      {
        value: 2,
        icons: ['🤔','🤫','🫢','🤭','🫣']
      },
      {
        value: 1,
        icons: ['🫠','🫨','😬','😵','🥴']
      },
    ]
  },
};

export const Edit2Selected1: Story = {
  args: {
    editing: false,
    controls: [
      {
        value: 2,
        icons: ['🤔','🤫','🫢','🤭','🫣'],
        selected: false,
        edit: true
      },
      {
        value: 1,
        icons: ['🫠','🫨','😬','😵','🥴'],
        selected: true,
        edit: true
      },
    ]
  },
};

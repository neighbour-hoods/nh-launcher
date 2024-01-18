import NHCheckbox from "./checkbox";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHTooltip } from "..";
import { b64images } from "@neighbourhoods/design-system-styles";

customElements.define('nh-checkbox', NHCheckbox)
!customElements.get('nh-tooltip') && customElements.define('nh-tooltip', NHTooltip)

export interface CheckboxProps {
  size: "small" | "medium" | "large";
}

const meta: Meta<CheckboxProps> = {
  title: "NHComponent/Input/Checkbox",
  component: "nh-checkbox",
  argTypes: {
    size: { options: ["small", "medium", "large"], control: { type: "radio" } },
  },
  parameters: { 
    backgrounds: { default: 'surface' },
  },
  render: (args) => html`<nh-checkbox
    .size=${args.size}
  ></nh-checkbox>`,
};

export default meta;

type Story = StoryObj<CheckboxProps>;

export const Default: Story = {
  args: {
    size: "medium",
  },
};
export const Small: Story = {
  args: {
    size: "small"
  },
};

export const WithTooltip: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"primary"} .text=${"Info about your field"}>
    <nh-checkbox
    slot="hoverable"
    .size=${args.size}
    ></nh-checkbox>
  </nh-tooltip>
  `,
  args: {
    size: "medium",
  },
};

export const WithTooltipRequired: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"danger"} .text=${"This is a required field."}>
    <nh-checkbox
    ?required=${true}
    slot="hoverable"
    .required=${true}
    .size=${args.size}
    ></nh-checkbox>
  </nh-tooltip>
  `,
  
  args: {
    size: "medium",
  },
};

export const RequiredErrored: Story = {
  render: (args) => html` <nh-tooltip .visible=${true} .variant=${"danger"} .text=${"This is a required field."}>
    <nh-checkbox
    .required=${true}
    .errored=${true}
    class="untouched"
    slot="hoverable"
    .size=${args.size}
    ></nh-checkbox>
  </nh-tooltip>
  `,
  args: {
    size: "medium",
  },
};
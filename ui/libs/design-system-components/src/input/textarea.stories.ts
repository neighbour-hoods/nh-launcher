import NHTextArea from "./textarea";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHTooltip } from "..";

!customElements.get("nh-textarea") && customElements.define("nh-textarea", NHTextArea);
!customElements.get("nh-tooltip") &&
  customElements.define("nh-tooltip", NHTooltip);

export interface TextAreaProps {
  placeholder: string;
  defaultValue: string;
  errored: boolean;
  required: boolean;
  size: "medium" | "large";
}

const meta: Meta<TextAreaProps> = {
  title: "NHComponent/Input/TextArea",
  component: "nh-textarea",
  argTypes: {
    placeholder: { control: "text" },
    size: { options: ["medium", "large"], control: { type: "radio" } },
  },
  parameters: {
    backgrounds: { default: "surface" },
  },
  render: (args) => html`<nh-textarea
    .placeholder=${args.placeholder}
    .defaultValue=${args.defaultValue}
    .required=${args.required}
    .errored=${args.errored}
    .size=${args.size}
  ></nh-textarea>`,
};

export default meta;

type Story = StoryObj<TextAreaProps>;

export const Default: Story = {
  args: {
    placeholder: "Type here",
    size: "medium"
  },
};

export const DefaultValue: Story = {
  args: {
    placeholder: "Type here",
    size: "medium",
    defaultValue: "testing!",
  },
};

const tooltipRender = (args: TextAreaProps) => html`
  <nh-tooltip .visible=${true} .variant=${args.errored ? "danger" : "primary"} .text=${args.required && !args.errored ? "This is a required field" : args.required && args.errored ? "This field must be filled out" : "Some information"}>
    <nh-textarea
      .required=${args.required}
      .errored=${args.errored}
      .placeholder=${args.placeholder}
      .size=${args.size}
      slot="hoverable"
    ></nh-textarea>
  </nh-tooltip>
`;

export const WithTooltip: Story = {
  render: tooltipRender,
  args: {
    placeholder: "Type here",
    required: false,
    errored: false,
    size: "medium"
  },
};

export const WithTooltipReqd: Story = {
  render: tooltipRender,
  args: {
    placeholder: "Type here",
    required: true,
    errored: false,
    size: "medium"
  },
};

export const RequiredErrored: Story = {
  render: tooltipRender,
  args: {
    placeholder: "Type here",
    required: true,
    errored: true,
    size: "medium"
  },
};

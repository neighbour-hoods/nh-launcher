import NHSpinner from "./spinner";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";

customElements.define('nh-spinner', NHSpinner)

export interface SpinnerProps {
  type: "page" | "icon";
}

const meta: Meta<SpinnerProps> = {
  title: "NHComponent/Spinner",
  component: "nh-spinner",
  argTypes: {
  },
  render: (args) => html`<nh-spinner
    .type=${args.type}
  >
  </nh-spinner>`,
};

export default meta;

type Story = StoryObj<SpinnerProps>;

export const Icon: Story = {
  args: {
    type: "icon",
  },
};

export const Page: Story = {
  args: {
    type: "page",
  },
};

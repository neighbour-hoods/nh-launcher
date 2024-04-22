import NHSelectAvatar from "./select-avatar";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { b64images } from "@neighbourhoods/design-system-styles";

customElements.define('nh-select-avatar', NHSelectAvatar)

export interface SelectAvatarProps {
  name: string;
  shape: string;
  required: boolean;
  errored: boolean;
  label: string;
  size: "sm" | "md" | "lg";
  customPlaceholder?: string;
}

const meta: Meta<SelectAvatarProps> = {
  title: "NHComponent/SelectAvatar",
  component: "nh-select-avatar",
  argTypes: {
  },
  render: (args) => html`<nh-select-avatar
    .name=${args.name}
    .shape=${args.shape}
    .size=${args.size}
    .label=${args.label}
    .customPlaceholder=${args?.customPlaceholder}
    .required=${args.required}
    .errored=${args.errored}
  >
  </nh-select-avatar>`
};

export default meta;

type Story = StoryObj<SelectAvatarProps>;

export const Circle: Story = {
  args: {
    name: 'Avatar',
    shape: 'circle',
    label: 'Avatar',
    required: false,
    size: 'sm'
  },
}

export const Square: Story = {
  args: {
    name: 'Avatar',
    shape: 'square',
    label: 'Avatar',
    required: false,
    size: 'sm'
  },
}

export const Rounded: Story = {
  args: {
    name: 'Avatar',
    shape: 'rounded',
    label: 'Avatar',
    required: false,
    size: 'sm'
  },
};

export const Md: Story = {
  args: {
    name: 'Avatar',
    shape: 'rounded',
    label: 'Avatar',
    required: false,
    size: 'md'
  },
};
export const Larg: Story = {
  args: {
    name: 'Avatar',
    shape: 'rounded',
    label: 'Avatar',
    required: false,
    size: 'lg'
  },
};
export const DefaultValue: Story = {
  args: {
    name: 'Avatar',
    shape: 'rounded',
    label: 'Avatar',
    required: false,
    customPlaceholder: b64images.icons.backCaret
  },
};

export const Required: Story = {
  args: {
    name: 'Avatar',
    shape: 'rounded',
    label: 'Avatar',
    required: true,
    customPlaceholder: b64images.icons.backCaret
  },
};

export const RequiredErrored: Story = {
  args: {
    name: 'Avatar',
    shape: 'rounded',
    label: 'Avatar',
    required: true,
    errored: true,
    customPlaceholder: b64images.icons.backCaret
  },
};

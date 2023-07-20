import { pearImg } from './b64images';
import "./menu";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { StaticValue, literal } from 'lit/static-html.js';

export interface MenuProps {
  direction: "vertical" | "horizontal";
  itemLabels: string[];
  itemComponentTag: StaticValue;
  itemComponentProps: object;
  theme: string;
  fixedFirstItem: boolean;
}

const meta: Meta<MenuProps> = {
  title: "NHComponent/Menu",
  component: "nh-menu",
  argTypes: {},
  render: (args) => html`<nh-menu
    direction=${args.direction}
    itemLabels=${args.itemLabels}
    itemComponentTag=${args.itemComponentTag}
    itemComponentProps=${args.itemComponentProps}
    theme=${args.theme}
    fixedFirstItem=${args.fixedFirstItem}
  >
  </nh-menu>`,
};

export default meta;

type Story = StoryObj<MenuProps>;

export const HorizontalButtons: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: { variant: "primary" },
    fixedFirstItem: false,
    theme: "dark",
  },
};

export const VerticalButtons: Story = {
  args: {
    direction: "vertical",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: { variant: "primary" },
    fixedFirstItem: false,
    theme: "dark",
  },
};

export const HorizontalIconButtons: Story = {
  args: {
    direction: "horizontal",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: { variant: "primary", iconImgB64: pearImg },
    fixedFirstItem: false,
    theme: "dark",
  },
};

export const VerticalIconButtons: Story = {
  args: {
    direction: "vertical",
    itemLabels: ["Posts", "Popular", "Recent", "Review"],
    itemComponentTag: literal`nh-button`,
    itemComponentProps: { variant: "primary", iconImgB64: pearImg },
    fixedFirstItem: false,
    theme: "dark",
  },
};

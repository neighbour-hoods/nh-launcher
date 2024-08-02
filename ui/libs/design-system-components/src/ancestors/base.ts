import { css, CSSResult, LitElement, unsafeCSS } from 'lit';

//@ts-ignore
import { Dark } from '@neighbourhoods/design-system-styles';

import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

export class NHComponent extends ScopedRegistryHost(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(Dark)}`];
}

export default NHComponent
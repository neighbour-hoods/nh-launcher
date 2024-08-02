import { query } from "lit/decorators.js"
import { html, css } from "lit"
//@ts-ignore
import NHButton from '@neighbourhoods/design-system-components/button';
//@ts-ignore
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';

export default class CreateOrJoinNh extends NHComponent
{
    static elementDefinitions = {
        'nh-button': NHButton,
    }

    static styles = css`
        .nh-creation-container {
            display: flex;
            flex-direction: column;
            text-align: center;
            color: var(--nh-theme-info-subtle);
        }
        .nh-creation-container input {
            width: 15em;
        }
    `
    //@ts-ignore
    @query('#ca-pubkey')
    input!: HTMLInputElement;

    render() {
        return html`
            <div class="nh-creation-container">
                <nh-button @click=${this.dispatchCreateNeighbourhood}>Create Neighbourhood</nh-button>
                <p>&mdash; or &mdash;</p>
                <div>
                    <input id="ca-pubkey" placeholder=${`community activator pubkey`} />
                    <nh-button @click=${this.dispatchJoinNeighbourhood}>Join Neighbourhood</nh-button>
                </div>
            </div>
        `
    }

    dispatchCreateNeighbourhood() {
        (this as any).dispatchEvent(new CustomEvent('create-nh'))
    }

    dispatchJoinNeighbourhood() {
        const newValue = this.input.value;
        if (newValue) {
            const options = {
                detail: {newValue},
                bubbles: true,
                composed: true
            };
            (this as any).dispatchEvent(new CustomEvent('join-nh', options))
            this.input.value = ''
        }
    }
}

import { css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { Profile, ProfilesStore } from '@holochain-open-dev/profiles';
import { NeighbourhoodInfo } from '@neighbourhoods/client';

import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import NHTextInput from '@neighbourhoods/design-system-components/input/text';
import NHSelectAvatar from '@neighbourhoods/design-system-components/select-avatar';
import NHSpinner from '@neighbourhoods/design-system-components/spinner';

import { StoreSubscriber } from 'lit-svelte-stores';
import { object, string } from 'yup';
import { isDataURL } from './helpers/functions';

export class ProfilePrompt extends NHComponent {
  @property()
  neighbourhoodInfo!: NeighbourhoodInfo;

  @property()
  profilesStore!: ProfilesStore;

  @query("nh-button[type='submit']") private _submitBtn;

  @state() private loading: boolean = false;

  _myProfile = new StoreSubscriber(
    this,
    () => this.profilesStore.myProfile,
    () => [],
  );

  async createProfile(model: any) {
    this.loading = true;
    const { nickname, avatar } = model;
    try {
      const payload: Profile = {
        nickname,
        fields: {
          avatar: avatar || '',
        },
      };
      await this.profilesStore!.client.createProfile(payload);
      await this.updateComplete;

      this.dispatchEvent(
        new CustomEvent('profile-created', {
          detail: {
            profile: payload,
          },
          bubbles: true,
          composed: true,
        }),
      );
      await this.requestUpdate();
    } catch (e) {
      this.dispatchEvent(
        new CustomEvent('trigger-alert', {
          detail: {
            title: 'Profile could not be created',
            msg: 'There was a problem creating your profile.',
            type: 'danger',
            closable: true,
          },
          bubbles: true,
          composed: true,
        }),
      );
      console.log('Installation error:', e);
    }
    this.loading = false;
  }

  render() {
    return html`
      <div class="container">
        <div slot="hero" class="hero">
          <img src=${this.neighbourhoodInfo.logoSrc!} />
          <h1>${this.neighbourhoodInfo.name}</h1>
          <h2>How would you like to appear in this neighbourhood?</h2>
        </div>
        <nh-card
          .theme=${'dark'}
          .textSize=${'md'}
          .hasPrimaryAction=${true}
          .title=${'Create Profile'}
          .footerAlign=${'r'}
        >
          <nh-form
            class="auto-height"
            .config=${{
              submitBtnLabel: "Create Profile",
              rows: [1],
              fields: [
                [
                  {
                    type: 'text',
                    placeholder: 'Enter your name',
                    label: 'Nickname:',
                    name: 'nickname',
                    id: 'nickname',
                    defaultValue: '',
                    required: true,
                  },
                  {
                    type: 'image',
                    label: 'Avatar:',
                    name: 'avatar',
                    id: 'avatar',
                    shape: 'circle',
                    required: false,
                  },
                ],
              ],
              submitOverload: this.createProfile.bind(this),
              schema: object({
                nickname: string()
                  .min(1, 'Must be at least 1 characters')
                  .required('Enter a name.'),
                _avatar: string().matches(isDataURL.regex, 'Must be a valid image data URI'),
              }),
            }}
          >
          </nh-form>
        </nh-card>
      </div>
    `;
  }

  static elementDefinitions = {
    'nh-card': NHCard,
    'nh-button': NHButton,
    'nh-spinner': NHSpinner,
    'nh-text-input': NHTextInput,
    'nh-select-avatar': NHSelectAvatar,
    'nh-form': NHForm,
  };

  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex: 1;
          justify-content: center;
          align-items: flex-start;
        }

        .container {
          margin-top: calc(1px * var(--nh-spacing-xl));
          padding: calc(1px * var(--nh-spacing-lg));
          align-items: center;
          justify-content: center;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 1rem;
          padding-bottom: calc(1px * var(--nh-spacing-sm));
        }

        .hero {
          color: var(--nh-theme-fg-default);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        h1 {
          font-weight: bold;
          margin-top: 20px;
          font-size: 1.2em;
        }

        h2 {
          margin: calc(1px * var(--nh-spacing-md));
          margin-top: calc(1px * var(--nh-spacing-sm));
          font-size: calc(1px * var(--nh-font-size-lg));
        }

        img {
          max-width: 20rem;
          border-radius: 100%;
        }

        nh-form {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
      `,
    ];
  }
}

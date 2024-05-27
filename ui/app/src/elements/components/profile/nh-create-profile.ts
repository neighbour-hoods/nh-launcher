import { css, CSSResult, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { Profile, ProfilesStore } from '@holochain-open-dev/profiles';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { object, string } from 'yup';
import { isDataURL } from '../helpers/functions';

import NHButton from '@neighbourhoods/design-system-components/button';
import NHCard from '@neighbourhoods/design-system-components/card';
import NHForm from '@neighbourhoods/design-system-components/form/form';
import NHTextInput from '@neighbourhoods/design-system-components/input/text';
import NHSelectAvatar from '@neighbourhoods/design-system-components/select-avatar';
import NHComponent from '@neighbourhoods/design-system-components/ancestors/base';
import { alertEvent } from '../../../decorators/alert-event';

export class NHCreateProfile extends NHComponent {
  @property() profilesStore!: ProfilesStore;

  @state() private loading : boolean = false;

  @query("nh-button[type='submit']") private _submitBtn;
  @alertEvent() danger;

  _myProfile = new StoreSubscriber(
    this,
    () => this.profilesStore.myProfile,
    () => [],
  );

  async createProfile(model: any) {
    this.loading = true;
    const { nickname, avatar } = model;
    try {
      const payload : Profile = {
        nickname,
        fields: {
          avatar: avatar || ''
        }
      }
      await this.profilesStore!.client.createProfile(payload);
      this.dispatchEvent(
        new CustomEvent('profile-created', {
          detail: {
            profile: payload,
          },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (e) {
      this.danger.emit({
        title: "Profile could not be created",
        msg: "There was a problem creating your profile."
      })
      this.loading = false;
      console.log('Installation error:', e);
    }
  }

  render() {
    return html`
      <nh-card .theme=${'dark'} .textSize=${"md"} .hasPrimaryAction=${true} .title=${'Create Profile'} .footerAlign=${"r"}>
        <div class="content">
          <nh-form
            .config=${(() => ({
              submitBtnRef: (() => this._submitBtn)(),
              rows: [1],
              fields: [[
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
              ]],
              submitOverload: this.createProfile.bind(this),
              schema: object({
                nickname: string()
                  .min(1, 'Must be at least 1 characters')
                  .required('Enter a name.'),
                avatar: string().matches(
                  isDataURL.regex,
                  'Must be a valid image data URI',
                ),
              }),
            }))()}
          >
          </nh-form>
        </div>
        <div slot="footer">
          <nh-button
            type="submit"
            .size=${"auto"}
            .variant=${"primary"}
            .disabled=${false}
            .loading=${false}
          >Create Profile</nh-button>
      </nh-card>
    `;
  }

  static elementDefinitions = {
    'nh-card': NHCard,
    'nh-button': NHButton,
    'nh-text-input': NHTextInput,
    "nh-select-avatar": NHSelectAvatar,
    "nh-form": NHForm,
  }

  static styles: CSSResult[] = [
    ...super.styles as CSSResult[],
    css`
      :host, .content {
        display: flex;
        justify-content: center;
        padding: calc(1px * var(--nh-spacing-xl))
      }

      nh-form {
        min-height: initial;
      }

      .content {
        justify-content: center;
        min-width: 25vw;
        width: 100%;
      }
    `,
  ];
}

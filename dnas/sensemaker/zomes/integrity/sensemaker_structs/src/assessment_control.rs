use hdi::prelude::*;
use crate::range::RangeKind;

#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentControlRegistration {
  pub applet_id: String,
  pub control_key: String,
  pub name: String,
  pub range_kind: RangeKind, // currently storing as nested which is not different from the input
  pub kind: String
}

impl TryFrom<AssessmentControlRegistrationInput> for AssessmentControlRegistration {
    // currently input is the same but leaving here in case implementation changes.
    type Error = WasmError;
    fn try_from(value: AssessmentControlRegistrationInput) -> Result<Self, Self::Error> {
        let registration = AssessmentControlRegistration {
            applet_id: value.applet_id,
            control_key: value.control_key,
            name: value.name,
            range_kind: value.range_kind,
            kind: value.kind,
        };
        Ok(registration)
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentControlRegistrationInput {
  pub applet_id: String,
  pub control_key: String,
  pub name: String,
  pub range_kind: RangeKind,
  pub kind: String
}

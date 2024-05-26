use hdk::prelude::*;
use nh_sensemaker_zome_lib::*;
use nh_zome_sensemaker_widgets_integrity::*;

#[hdk_extern]
fn get_assessment_tray_config(assessment_tray_eh: EntryHash) -> ExternResult<Option<Record>> {
    let maybe_tray = get(assessment_tray_eh, GetOptions::default())?;
    Ok(maybe_tray)
}

#[derive(Debug, Clone, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentWidgetTrayConfigInput {
    pub name: String,
    pub assessment_widget_blocks: Vec<AssessmentWidgetBlockConfig>,
}

impl TryFrom<AssessmentWidgetTrayConfigInput> for AssessmentWidgetTrayConfig {
    type Error = WasmError;
    fn try_from(value: AssessmentWidgetTrayConfigInput) -> Result<Self, Self::Error> {
        let registration = AssessmentWidgetTrayConfig {
            name: value.name,
            assessment_widget_blocks: value.assessment_widget_blocks,
        };
        Ok(registration)
    }
}

#[hdk_extern]
fn set_assessment_tray_config(tray_config_input: AssessmentWidgetTrayConfigInput) -> ExternResult<Record> {
    let input: AssessmentWidgetTrayConfig = tray_config_input.clone().try_into()?;
    let action_hash = create_entry(&EntryTypes::AssessmentWidgetTrayConfig(input.clone()))?;

    let eh = hash_entry(EntryTypes::AssessmentWidgetTrayConfig(input.clone()))?;

    create_link(
        tray_configs_typed_path()?.path_entry_hash()?,
        eh.clone(),
        LinkTypes::AssessmentTrayConfig,
        (),
    )?;

    let record = get(action_hash.clone(), GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("AssessmentWidgetTrayConfig could not be retrieved after creation".into())))?;

    Ok(record)
}

// GET/SET default config
  // get - create a link from the resource_def_eh to the default config with the ResourceDefDefaultAssessmentTrayConfig link type
  // set - delete the existing link if it exists and create a new one. 

fn tray_configs_typed_path() -> ExternResult<TypedPath> {
    Path::from("assessment_tray_config").typed(LinkTypes::AssessmentTrayConfig)
}
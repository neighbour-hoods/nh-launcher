use hdk::prelude::*;
use std::convert::Infallible;

#[derive(thiserror::Error, Debug)]
pub enum WeError {
    #[error(transparent)]
    Serialization(#[from] SerializedBytesError),
    #[error(transparent)]
    Infallible(#[from] Infallible),
    #[error(transparent)]
    EntryError(#[from] EntryError),
    #[error("Get failed")]
    GetError,
    #[error(transparent)]
    Wasm(#[from] WasmError),
    #[error(transparent)]
    Timestamp(#[from] TimestampError),
    #[error("Failed to get who data")]
    WhoError,
}

pub type WeResult<T> = Result<T, WeError>;

impl From<WeError> for WasmError {
    fn from(c: WeError) -> Self {
        wasm_error!(WasmErrorInner::Guest(c.to_string()))
    }
}

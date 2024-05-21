import { EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import { Assessment } from "./assessment";

export type Option<Inner> = Inner | null

export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
    let ret_val = a.byteLength == b.byteLength;
    return ret_val && a.reduce((prev: boolean, aByte: number, index: number) => (prev && aByte == b[index]), ret_val);
}

export function getLatestAssessment(assessments: Assessment[], dimension_eh: EntryHashB64): Option<Assessment> {
    const assessmentOnDimension = assessments.filter(assessment => encodeHashToBase64(assessment.dimension_eh) === dimension_eh);
    // return latestAssessment to the one with the greatest value
    if (assessmentOnDimension.length === 0) {
        return null;
    }
    else {
        const latestAssessment = assessmentOnDimension.reduce((prev, current) => {
            if (prev.timestamp > current.timestamp) {
                return prev;
            } else {
                return current;
            }
        }
        )
        return latestAssessment;
    }
}

export function serializeAsyncActions<T>(actions: Array<() => Promise<T>>) {
    let actionFiber = Promise.resolve({}) as Promise<T>;
    actionFiber = actions.reduce((chain: Promise<T>, curr) => chain.then(curr), actionFiber);
}
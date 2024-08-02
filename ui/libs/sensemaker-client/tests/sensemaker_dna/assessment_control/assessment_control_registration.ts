import { AssessmentControlRegistrationInput } from '#client';
import { AgentPubKey, EntryHash, Record } from "@holochain/client";
import {
  pause,
  runScenario,
  cleanAllConductors,
} from "@holochain/tryorama";


import pkg from "tape-promise/tape";
import { EntryRecord } from "@holochain-open-dev/utils";
import { setUpAliceandBob } from '../../utils';
const { test } = pkg;

export default () => {
  test("Assessment Control registration", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        cleanup,
        alice_agent_key,
        bob_agent_key,
        ss_cell_id_alice,
        ss_cell_id_bob,
        provider_cell_id_alice,
        provider_cell_id_bob,
      } = await setUpAliceandBob();

      const callZomeAlice = async (
        zome_name,
        fn_name,
        payload,
        is_ss = true
      ) => {
        return await alice.callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await bob.callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      try {
        const pauseDuration = 1000
        await scenario.shareAllAgents();
        await pause(pauseDuration*2);

        // Test 0: Given no registered controls Then Alice can read all registered controls and get an empty array

        const getAll1 : Record[] = await callZomeAlice(
          "assessment_tray",
          "get_assessment_control_registrations",
          null
        );
        t.deepEqual([], getAll1);

      // Test 1: Alice can create a control registration entry
        // use provider DNA method to get some entry hash for applet_eh
        const installedAppId: string = "applet-test-neighbourhood-13687278ewqr78ewq9r7w8e6rtqwbygvhauigyoqru";
        // create range
        const twentyScaleRangeKind = {
          "Integer": { "min": 0, "max": 20 }
        };
        const testAssessmentControlRegistration: AssessmentControlRegistrationInput = {
          appletId: installedAppId,
          controlKey: 'importance',
          name: 'Importance Control',
          rangeKind: twentyScaleRangeKind,
          kind: 'input'
        };
        const controlRegistrationCreationRecord : Record = await callZomeAlice(
          "assessment_tray",
          "register_assessment_control",
          testAssessmentControlRegistration,
          true
        );
        t.ok(controlRegistrationCreationRecord, "create a new assessment control registration");

        const controlRegistrationCreationEntryRecord = new EntryRecord<AssessmentControlRegistrationInput>(controlRegistrationCreationRecord);

        t.deepEqual(controlRegistrationCreationEntryRecord.entry.rangeKind, twentyScaleRangeKind, "created assessment control registration with the correct range");

        // Test 2: Given a created registration entry Then Alice can read that control registration entry

        const get1 = await callZomeAlice(
          "assessment_tray",
          "get_assessment_control_registration",
          controlRegistrationCreationEntryRecord.entryHash
        );
        t.ok(get1, "get an assessment control registration");

        const getAssessmentControlRegistrationEntryRecord = new EntryRecord<AssessmentControlRegistrationInput>(get1);
        t.deepEqual(getAssessmentControlRegistrationEntryRecord.entry.rangeKind, twentyScaleRangeKind, "got assessment control registration with the correct range");

        // Test 3: Given a created registration entry Then Alice can read all registered assessment_tray and get an array of one

        const getAll2 : Record[] = await callZomeAlice(
          "assessment_tray",
          "get_assessment_control_registrations",
          null
        );
        t.equal(1, getAll2.length);
        const firstRecord = new EntryRecord<AssessmentControlRegistrationInput>(getAll2[0]);
        t.deepEqual(firstRecord.entry.rangeKind, twentyScaleRangeKind, "got assessment control registrations with the correct range");


        // Test 4: Given a created registration entry Then Alice can delete that control registration entry

        const delete1 = await callZomeAlice(
          "assessment_tray",
          "delete_assessment_control_registration",
          controlRegistrationCreationEntryRecord.actionHash
        );
        t.ok(delete1, "deleted an assessment control registration");
        await pause(pauseDuration);

      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      // And Then getting all registration entries returns an empty array
      const getAll3 : Record[] = await callZomeAlice(
        "assessment_tray",
        "get_assessment_control_registrations",
        null
      );
      t.equal(0, getAll3.length);

      await cleanup();
    });
  });
};

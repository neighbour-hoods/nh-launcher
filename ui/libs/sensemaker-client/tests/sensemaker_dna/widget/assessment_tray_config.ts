import { EntryRecord } from '@holochain-open-dev/utils';
import { EntryHash } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { AssessmentWidgetTrayConfig, AssessmentWidgetBlockConfig } from "#client";
import { setUpAliceandBob } from "../../utils";

import pkg from "tape-promise/tape";
const { test } = pkg;

export default () => {
  test("Test setting and getting assessment tray config block", async (t) => {
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
        is_ss = true
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

        // :SHONK: use provider DNA method to get some entry hash for Resource Def anchors
        const dummyEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          { title: 'dummy', content: 'test' },
          false,
        );

        let getEmpty: AssessmentWidgetTrayConfig = await callZomeAlice(
          "widgets",
          "get_assessment_tray_config",
          dummyEntryHash
        );
        t.equal(getEmpty, null, "Get assessment tray config when there is none at that eh returns null")

        // create a config
        const testWidgetConfig1 = {
          inputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
          outputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
        };
        const testWidgetConfig2 = {
          inputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
          outputAssessmentWidget: {
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-component',
          },
        };

        const create1 = await callZomeAlice(
          "widgets",
          "set_assessment_tray_config",
          {
            name: 'test config',
            assessmentWidgetBlocks: [testWidgetConfig1, testWidgetConfig2],
          }
        );
        t.ok(create1, "creating a new tray config succeeds");
        await pause(pauseDuration);

        const entryRecordCreate1 = new EntryRecord<AssessmentWidgetTrayConfig>(create1);

        // read config back out & check for correctness
        const read1 = await callZomeBob(
          "widgets",
          "get_assessment_tray_config",
          entryRecordCreate1.entryHash
        );
        const entryRecordRead1 = new EntryRecord<AssessmentWidgetTrayConfig>(read1);
        t.ok(entryRecordRead1.entry, "Tray config retrievable by other agent");
        t.equal(entryRecordRead1.entry.name, "test config", "retrieved tray config name is the same");
        t.deepEqual(entryRecordRead1.entry.assessmentWidgetBlocks, [testWidgetConfig1, testWidgetConfig2], "retrieved tray config blocks are the same, have same order");

        // // swap the configs
        // const update2: EntryHash[] = await callZomeAlice(
        //   "widgets",
        //   "set_assessment_tray_config",
        //   {
        //     resourceDefEh: dummyEntryHash,
        //     widgetConfigs: [testWidgetConfig2, testWidgetConfig1],
        //   }
        // );
        // t.ok(update2, "updating tray config with a new ordering succeeds");
        // console.info('AssessmentWidgetBlockConfig hashes: ', update2);
        // await pause(pauseDuration);

        // // read config back out & check for correctness
        // const read2: AssessmentWidgetBlockConfig[] = await callZomeAlice(
        //   "widgets",
        //   "get_assessment_tray_config",
        //   { resourceDefEh: dummyEntryHash }
        // );
        // t.deepEqual(read2, [testWidgetConfig2, testWidgetConfig1], "tray config reordering succeeded");

        // // create a new widget config and replace one of the prior ones with it
        // const testWidgetConfig1b = {
        //   inputAssessmentWidget: {
        //     type: 'standalone',
        //     dimensionEh: dummyEntryHash,
        //     widgetRegistryEh: dummyEntryHash,
        //   },
        //   outputAssessmentWidget: {
        //     type: 'standalone',
        //     dimensionEh: dummyEntryHash,
        //     widgetRegistryEh: dummyEntryHash,
        //   },
        // };
        // const update3: EntryHash[] = await callZomeAlice(
        //   "widgets",
        //   "set_assessment_tray_config",
        //   {
        //     resourceDefEh: dummyEntryHash,
        //     widgetConfigs: [testWidgetConfig2, testWidgetConfig1b, testWidgetConfig1],
        //   }
        // );
        // t.ok(update3, "updating tray config with a newly inserted widget block succeeds");
        // await pause(pauseDuration);

        // // read config back out & check for correctness
        // const configCheck3: AssessmentWidgetBlockConfig[] = await callZomeBob(
        //   "widgets",
        //   "get_assessment_tray_config",
        //   { resourceDefEh: dummyEntryHash }
        // );
        // console.log('configCheck3 ====== test', configCheck3, [testWidgetConfig2, testWidgetConfig1b, testWidgetConfig1])
        // t.deepEqual(configCheck3, [testWidgetConfig2, testWidgetConfig1b, testWidgetConfig1], "tray config reordering preserved upon injecting blocks");

        // // assert 'permission denied' error, only the CA can create
        // try {
        //   let config: AssessmentWidgetBlockConfig = await callZomeBob(
        //     "widgets",
        //     "set_assessment_tray_config",
        //     {
        //       resourceDefEh: dummyEntryHash,
        //       widgetConfigs: [testWidgetConfig2, testWidgetConfig1],
        //     }
        //   );
        // } catch (e) {
        //   //@ts-ignore
        //   console.info(e.message)
        //   //@ts-ignore
        //   t.ok(e.message.match("only the community activator can create this entry"), "only network CA can configure resource widget trays; more complex permission structures planned in future");
        // }
      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await cleanup();
    });
  });
};

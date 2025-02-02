import { DnaSource, Record, ActionHash, EntryHash, AppEntryDef } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import { AppletConfig, AppletConfigInput, Assessment, CreateAssessmentInput, Dimension, Method, RangeValueInteger } from "#client";
import { ok } from "assert";
import pkg from "tape-promise/tape";
import { installAgent, sampleAppletConfig, setUpAliceandBob } from "../../utils";
import { EntryRecord } from "@holochain-open-dev/utils";
const { test } = pkg;

interface TestPost {
  title: string;
  content: string;
}

export default () => {
  test("test fetching dashboard data", async (t) => {
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
        is_ss = false
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
        await pause(pauseDuration);

        // create an entry type in the provider DNA
        const createPost: TestPost = {
          title: "post 1",
          content: "hey!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost
        );
        t.ok(createPostEntryHash);

        const createPost2: TestPost = {
          title: "post 2",
          content: "bye!",
        };
        const createPostEntryHash2: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost2
        );
        t.ok(createPostEntryHash2);

        const createPost3: TestPost = {
          title: "post 3",
          content: "I'm back!",
        };
        const createPostEntryHash3: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost3
        );
        t.ok(createPostEntryHash3);
        await pause(pauseDuration);

        // Bob gets the created post
        const readPostOutput: Record = await callZomeBob(
          "test_provider",
          "get_post",
          createPostEntryHash
        );
        t.deepEqual(
          createPost,
          decode((readPostOutput.entry as any).Present.entry) as any
        );

        let app_entry_def: AppEntryDef = { entry_index: 0, zome_index: 0, visibility: { Public: null } };
        const appletConfigInput = await sampleAppletConfig(app_entry_def)
        const createAppletConfigInput: AppletConfigInput = appletConfigInput;
        const appletConfig: AppletConfig = await callZomeAlice(
          "sensemaker",
          "register_applet",
          createAppletConfigInput,
          true
        );
        t.ok(appletConfig);
        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);


        // Create range and dimensions now not created in register_applet
        const integerRange = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 10 },
          },
        };

        const rangeRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        const rangeEntryRecord = new EntryRecord<Range>(rangeRecord);
        const rangeHash = rangeEntryRecord.entryHash;

        const createDimension = {
          name: "likeness",
          range_eh: rangeHash,
          computed: false,
        };

        const createDimensionRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        );
        const likenessDimensionEntryHash = new EntryRecord<Dimension>(
          createDimensionRecord
        ).entryHash;
        t.ok(likenessDimensionEntryHash);

        // create an assessment on the Post
        const createP1Assessment: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: likenessDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
          maybe_input_dataset: null,
        };

        const createP1AssessmentRecord = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP1Assessment,
          true
        );
        const createP1AssessmentEntryHash = new EntryRecord<Assessment>(createP1AssessmentRecord).entryHash;
        t.ok(createP1AssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createP1Assessment2: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: likenessDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
          maybe_input_dataset: null,
        };

        const createP1AssessmentRecord2 = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP1Assessment2,
          true
        );
        const createP1AssessmentEntryHash2 = new EntryRecord<Assessment>(createP1AssessmentRecord2).entryHash;
        t.ok(createP1AssessmentEntryHash2);

        const createP2Assessment: CreateAssessmentInput = {
          value: { Integer: 3 },
          dimension_eh: likenessDimensionEntryHash,
          resource_eh: createPostEntryHash2,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
          maybe_input_dataset: null,
        };

        const createP2AssessmentRecord = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP2Assessment,
          true
        );
        const createP2AssessmentEntryHash = new EntryRecord<Assessment>(createP2AssessmentRecord).entryHash;
        t.ok(createP2AssessmentEntryHash);

        // create an assessment on the Post
        const createP2Assessment2: CreateAssessmentInput = {
          value: { Integer: 3 },
          dimension_eh: likenessDimensionEntryHash,
          resource_eh: createPostEntryHash2,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
          maybe_input_dataset: null,
        };

        const createP2AssessmentRecord2 = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP2Assessment2,
          true
        );
        const createP2AssessmentEntryHash2 = new EntryRecord<Assessment>(createP2AssessmentRecord2).entryHash;
        t.ok(createP2AssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createP3Assessment: CreateAssessmentInput = {
          value: { Integer: 2 },
          dimension_eh: likenessDimensionEntryHash,
          resource_eh: createPostEntryHash3,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
          maybe_input_dataset: null,
        };

        const createP3AssessmentRecord = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP3Assessment,
          true
        );
        const createP3AssessmentEntryHash = new EntryRecord<Assessment>(createP3AssessmentRecord).entryHash;
        t.ok(createP3AssessmentEntryHash);

        const createP3Assessment2: CreateAssessmentInput = {
          value: { Integer: 2 },
          dimension_eh: likenessDimensionEntryHash,
          resource_eh: createPostEntryHash3,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
          maybe_input_dataset: null,
        };

        const createP3AssessmentRecord2 = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP3Assessment2,
          true
        );
        const createP3AssessmentEntryHash2 = new EntryRecord<Assessment>(createP3AssessmentRecord2).entryHash;
        t.ok(createP3AssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // define objective dimension

        // fetch all assessments
        const allAssessments: Array<Assessment> = await callZomeAlice(
          "sensemaker",
          "get_all_assessments",
          null,
          true
        );
        console.log('all assessments', allAssessments)
        t.deepEqual(allAssessments.length, 6);
      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await cleanup();
    });
  });
};

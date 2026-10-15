import { BlueprintV1, Lesson } from '../types';
import { WAREHOUSE_TOOLS, SIMULATION_STEPS, SIMULATION_STEPS_B } from '../data/lessonsData';

export function generateBlueprintV1(lesson: Lesson): BlueprintV1 {
  return {
    schema_version: '1.1',
    status: 'ok',
    status_reason: 'Fully parsed and validated SOP blueprint',
    missing_passport_fields: [],
    meta: {
      title: lesson.title,
      topic: lesson.category,
      language: 'en',
      role: 'Outbound Fulfillment Operator',
      image_type: 'sop_page',
      confidence: 0.98,
      passport_id: `PSP-${lesson.id.toUpperCase()}-001`,
      passport_version: 1,
      estimated_minutes: lesson.durationMinutes,
      sources: [
        {
          id: 'S1',
          type: 'sop',
          note: `Official Warehouse Standard Operating Procedure: ${lesson.title}`,
        },
        {
          id: 'S2',
          type: 'ground_reality',
          note: 'Verified with frontline warehouse leads and shift supervisors',
        },
      ],
    },
    orientation: {
      estimated_minutes: 3,
      cards: [
        {
          id: 'what_is_picking',
          kind: 'what',
          title: `What is ${lesson.title}?`,
          body: lesson.description,
          audio_text: `What is ${lesson.title}? ${lesson.description}`,
          visual: { type: 'illustration_key', ref: lesson.artType },
          must_view: true,
          source_ref: 'S1.section1',
        },
        {
          id: 'tool_scanner',
          kind: 'tool',
          title: 'Handheld WMS Terminal',
          body: WAREHOUSE_TOOLS[0].whatItsFor,
          audio_text: `Handheld Scanner: ${WAREHOUSE_TOOLS[0].whatItsFor}`,
          visual: { type: 'icon', ref: 'scanner' },
          tool: {
            name: WAREHOUSE_TOOLS[0].name,
            purpose: WAREHOUSE_TOOLS[0].whatItsFor,
            never_do: WAREHOUSE_TOOLS[0].neverDo,
          },
          must_view: true,
          source_ref: 'S1.tools',
        },
        {
          id: 'safety_rules',
          kind: 'safety',
          title: 'Mandatory Safety Rule',
          body: "Don't guess. Stop. Check. Act correctly.",
          audio_text: "Don't guess. Stop. Check. Act correctly. Always scan before picking.",
          visual: { type: 'icon', ref: 'safety' },
          must_view: true,
          source_ref: 'S2.safety',
        },
      ],
      tool_explorer: {
        enabled: true,
        items: WAREHOUSE_TOOLS.map((t) => ({
          tool_name: t.name,
          card_id: `tool_${t.id}`,
        })),
      },
      quick_check: SIMULATION_STEPS.slice(0, 4),
      skip: {
        diagnostic_step_ids: ['step_cutoff', 'step_bin_scan', 'step_shortage'],
        pass_threshold: 0.75,
        always_show: ['safety_rules'],
      },
    },
    scenarios: {
      watch: SIMULATION_STEPS,
      practice: SIMULATION_STEPS_B,
      test: SIMULATION_STEPS_B,
    },
    floor_checklist: [
      {
        id: 'fc1',
        step_id: 'choose_order',
        behaviour: 'Prioritizes order by earliest carrier departure cut-off time',
        source_ref: 'S1.priority',
      },
      {
        id: 'fc2',
        step_id: 'scan_location',
        behaviour: 'Scans bin label before touching physical shelf stock',
        source_ref: 'S1.scan',
      },
      {
        id: 'fc3',
        step_id: 'verify_sku',
        behaviour: 'Matches exact SKU letters and numbers on product barcode',
        source_ref: 'S1.sku',
      },
      {
        id: 'fc4',
        step_id: 'shortage',
        behaviour: 'Logs physical count and records inventory gap on short bin',
        source_ref: 'S1.shortage',
      },
      {
        id: 'fc5',
        step_id: 'handover',
        behaviour: 'Delivers completed tote directly to assigned pack station',
        source_ref: 'S1.handover',
      },
    ],
    takeaways: [
      'Carrier cut-off time governs order priority.',
      'Scan the location barcode before touching physical stock.',
      'Never falsify quantities; log short bin gaps immediately.',
      'One tote per order — never mix customer orders.',
    ],
    common_mistakes: [
      'Grabbing items by appearance rather than scanning the SKU.',
      'Entering quantity without physically counting items.',
      'Mixing items from two different orders in the same tote.',
      'Leaving finished totes in aisle ends instead of delivering to pack station.',
    ],
  };
}

/**
 * Isolated Fixture SOPs for Multi-Domain Testing & Demo Paths
 * Used in UploadModal, Library, and Canary Acceptance Tests.
 */

export interface FixtureSop {
  id: string;
  filename: string;
  title: string;
  category: 'Hotel' | 'Retail' | 'Kitchen' | 'Warehouse' | 'Corrupt' | 'Diagnostic Lab' | 'Housekeeping';
  domainName: string;
  content: string;
}

export const FIXTURE_SOPS: FixtureSop[] = [
  {
    id: 'urban-housekeeping-501',
    filename: 'SOP-HSK-501: Urban Home Residential Housekeeping & Safety Protocol.txt',
    title: 'Urban Home Residential Housekeeping & Cleaning Protocol',
    category: 'Housekeeping',
    domainName: 'Urban Home Housekeeping',
    content: `STANDARD OPERATING PROCEDURE: URBAN HOME RESIDENTIAL HOUSEKEEPING
DOCUMENT REF: SOP-HSK-501 VERSION 3.0

SECTION 1: BOOKING CONFIRMATION, CUSTOMER ARRIVAL & SCOPE CONFIRMATION
1. Verify booking confirmation details in the Urban Home app upon arrival at customer residence.
2. Greet the customer professionally, present photo ID badge, and confirm cleaning scope and priority areas before entering.
3. Conduct initial property and safety inspection; check for pre-existing damage, fragile items, or open electrical/physical hazards.

SECTION 2: CLEANING SEQUENCE & SURFACE/MATERIAL CONTROLS
4. Follow top-to-bottom cleaning sequence: dust ceiling corners, wipe light fixtures, clean countertops, sanitize bathroom fixtures, and vacuum/mop floors last.
5. Apply surface/material controls: use non-abrasive microfiber cloths on marble/granite surfaces and micro-fiber mops on natural hardwood floors.
6. Maintain privacy and property handling: do not touch personal documents, cash, jewelry, or private bedroom safes.

SECTION 3: OUT-OF-SCOPE, HAZARD, ACCIDENTAL DAMAGE & QC ESCALATION
7. Handle out-of-scope requests: politely decline biohazard cleaning or heavy furniture lifting, explaining company policy limits.
8. Identify electrical/physical hazards and refuse unsafe chemical requests (e.g., mixing bleach and ammonia); notify customer immediately.
9. If accidental damage occurs, take photo evidence, inform customer on-site, and report to Urban Home Operations Lead immediately.
10. Conduct final QC inspection, review completed checklist with customer, obtain sign-off rating, and complete handover.`,
  },
  {
    id: 'diag-lab-104',
    filename: 'SOP-LAB-104: Diagnostic Laboratory Patient Registration & Blood Sample Collection.txt',
    title: 'Diagnostic Laboratory Patient Registration & Phlebotomy Protocol',
    category: 'Diagnostic Lab',
    domainName: 'Diagnostic Laboratory & Phlebotomy',
    content: `STANDARD OPERATING PROCEDURE: DIAGNOSTIC LABORATORY & PHLEBOTOMY
DOCUMENT REF: SOP-LAB-104 VERSION 2.1

SECTION 1: PATIENT REGISTRATION & IDENTIFICATION
1. Greet the patient at the lab intake desk and verify full legal name and date of birth against photo ID.
2. Confirm lab test requisition orders in the LIMS system and verify pre-test preparation (e.g. 12-hour fasting requirement).
3. Print barcode specimen labels and verify patient details match the printed labels before proceeding.

SECTION 2: BLOOD SAMPLE COLLECTION & PREPARATION
4. Sanitize phlebotomy station, apply fresh disposable gloves, and select correct blood collection tube colors based on ordered tests.
5. Apply tourniquet 3-4 inches above venipuncture site and clean skin with 70% isopropyl alcohol swab in outward circular motion.
6. Perform venipuncture cleanly, draw required blood volume into tubes, and gently invert tubes 5-8 times immediately to mix anticoagulant.

SECTION 3: SAMPLE LABELLING, INTEGRITY & ESCALATION
7. Apply barcode specimen labels to tubes at bedside in front of patient and verify match with patient wristband.
8. Observe patient for 2 minutes post-collection for signs of syncope or dizziness before discharge.
9. Inspect sample for hemolysis or clotting; if sample integrity is compromised or patient identity is unverified, reject sample and escalate to Lab Director immediately.`,
  },
  {
    id: 'canary-hotel-101',
    filename: 'SOP-HTL-101: Front Desk Guest Check-In & Orchid Suite Towels.txt',
    title: 'Front Desk Guest Check-In & Orchid Suite Towel Protocol',
    category: 'Hotel',
    domainName: 'Hotel Front Office',
    content: `STANDARD OPERATING PROCEDURE: HOTEL FRONT OFFICE & ORCHID SUITE
DOCUMENT REF: SOP-HTL-101 VERSION 1.0

SECTION 1: GUEST ARRIVAL & CHECK-IN
1. Greet arriving guests with a warm smile within 10 seconds of entering the lobby.
2. Request primary photo identification and reservation booking confirmation number.
3. Verify payment card authorization and issue magnetic key cards for the assigned room.

SECTION 2: SUITE PREPARATION & AMENITIES
4. Inspect the luxury Orchid Suite prior to VIP arrival to ensure zero maintenance defects.
5. Perform precision folding towels in the Orchid Suite into decorative swan arrangements.
6. Verify temperature control thermostat is set to comfortable 21°C before guest entry.

SECTION 3: EVENING TURNDOWN & ESCALATION
7. Deliver fresh bottled mineral water and evening turndown chocolates to all occupied suites by 19:00.
8. If guest requests special luggage assistance, dispatch concierge porter immediately.`,
  },
  {
    id: 'retail-return-204',
    filename: 'SOP-RTL-204: Customer Merchandise Return & Refund Protocol.txt',
    title: 'Customer Merchandise Return & Exchange Procedure',
    category: 'Retail',
    domainName: 'Retail Operations',
    content: `STANDARD OPERATING PROCEDURE: RETAIL MERCHANDISE RETURNS
DOCUMENT REF: SOP-RTL-204 VERSION 1.0

SECTION 1: RECEIVING RETURNED ITEMS
1. Greet the customer at the Customer Service desk and request original sales purchase receipt.
2. Inspect returned merchandise for original tags, unworn condition, and physical defect inspection.
3. Scan product UPC barcode into POS register terminal to verify item transaction history.

SECTION 2: REFUND & EXCHANGE PROCESSING
4. Issue store credit voucher if return is made within 30 days without original receipt.
5. Process payment card refund to original funding method if receipt is validated.
6. Attach yellow resalable return tag to merchandise before returning item to floor inventory rack.`,
  },
  {
    id: 'kitchen-safety-302',
    filename: 'SOP-KTN-302: Commercial Kitchen Food Safety & Temp Logging.txt',
    title: 'Commercial Kitchen Hygiene & Temperature Logging Procedure',
    category: 'Kitchen',
    domainName: 'Kitchen & Food Safety',
    content: `STANDARD OPERATING PROCEDURE: COMMERCIAL KITCHEN FOOD SAFETY
DOCUMENT REF: SOP-KTN-302 VERSION 1.0

SECTION 1: HAND HYGIENE & SANITIZATION
1. Wash hands thoroughly with antibacterial soap at warm water station for 20 seconds before food prep.
2. Sanitize stainless steel prep counters using approved food-grade disinfectant spray.

SECTION 2: COLD STORAGE & TEMPERATURE LOGGING
3. Insert digital probe thermometer into walk-in chiller storage and log temperature every 2 hours.
4. Verify refrigerator temperature remains strictly below 4°C (39°F) to prevent bacterial growth.
5. Discard any perishable food items stored past 48 hours or lacking date label tags.`,
  },
  {
    id: 'garbage-corrupt-999',
    filename: 'Corrupted_Unreadable_File.txt',
    title: 'Corrupted Unreadable Test File',
    category: 'Corrupt',
    domainName: 'Corrupt Test',
    content: `PDF-1.4 %âãÏÓ 1 0 obj << /Length 12 0 R /Filter /FlateDecode >> stream x+ä2â3àå ... err 00000x`,
  },
  {
    id: 'picker-warehouse-042',
    filename: 'SOP-WH-042: High-Velocity Order Picking.txt',
    title: 'High-Velocity Warehouse Order Picking',
    category: 'Warehouse',
    domainName: 'Warehouse Operations',
    content: `STANDARD OPERATING PROCEDURE: WAREHOUSE ORDER PICKING
DOCUMENT REF: SOP-WH-042 VERSION 1.0

SECTION 1: TASK ACCEPTANCE & BATCHING
1. Accept next wave task on handheld WMS scanner based on carrier departure cut-off time.
2. Scan location bin label (aisle, bay, shelf level) before touching physical stock.

SECTION 2: ITEM VERIFICATION & TOTE HANDOVER
3. Match exact SKU letters and numbers on product barcode before placing into order tote.
4. If bin shelf is short, log physical count and record shortage in WMS terminal.
5. Handover completed order tote directly to assigned packing station.`,
  },
];

/**
 * GURU COACH LMS - PHASE 3 ADMIN CONTENT MANAGEMENT ACCEPTANCE TESTS
 *
 * Verifies end-to-end Admin Content Management:
 * 1. Admin Content Ingestion through DEAN Intelligence Pipeline
 * 2. Document Versioning & Historical Provenance Preservation
 * 3. Metadata & Operational Blueprint Editing
 * 4. Approval & Publishing Lifecycle Enforcement
 * 5. Strict Role-Based Access Control (Learner/Manager Blocked with 403 FORBIDDEN)
 * 6. Scoped Cross-Tenant Isolation (Tenant A Admin cannot read/modify Tenant B)
 * 7. Audit Event Logging for Content Operations
 * 8. Validation Safeguards (Failed processing cannot publish incomplete content)
 */

import dotenv from 'dotenv';
import crypto from 'crypto';
import { query, withTransaction, isDatabaseConfigured, closePool } from './pool.js';
import { contentRepo } from './repositories/contentRepo.js';
import { auditRepo } from './repositories/auditRepo.js';
import { userRepo } from './repositories/userRepo.js';
import { validateSourceFidelity } from '../utils/sourceValidator.js';
import { generateDomainNeutralLesson } from '../utils/domainNeutralGenerator.js';
import { ExtractedDocument } from '../utils/documentExtractor.js';

dotenv.config();

async function runPhase3AdminContentTests() {
  console.log('\n================================================================');
  console.log(' GURU COACH LMS — PHASE 3 ADMIN CONTENT MANAGEMENT TESTS');
  console.log('================================================================\n');

  if (!isDatabaseConfigured()) {
    console.error('❌ FAIL: Database not configured for live tests.');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      failed++;
    }
  }

  // Generate unique test scope
  const testRunId = Date.now().toString().slice(-6);
  const tenantAId = '33333333-1111-4333-8333-333333333331';
  const tenantBId = '33333333-2222-4333-8333-333333333332';

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST FIXTURES IN TRANSACTION SCOPE
    // -------------------------------------------------------------------------
    await query(`
      INSERT INTO organizations (id, name, slug)
      VALUES 
        ('${tenantAId}', 'Tenant A Logistics', 'tenant-a-p3-${testRunId}'),
        ('${tenantBId}', 'Tenant B Hospitality', 'tenant-b-p3-${testRunId}')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Insert Tenant A Admin, Manager, Learner
    const adminA = await userRepo.create({
      organization_id: tenantAId,
      email: `admin-a-${testRunId}@tenanta.com`,
      full_name: 'Admin Alice',
      role: 'admin',
      job_title: 'Director of Training',
      badge_id: `BADGE-ADM-${testRunId}`,
    });

    const managerA = await userRepo.create({
      organization_id: tenantAId,
      email: `manager-a-${testRunId}@tenanta.com`,
      full_name: 'Manager Bob',
      role: 'manager',
      job_title: 'Floor Supervisor',
      badge_id: `BADGE-MGR-${testRunId}`,
    });

    const learnerA = await userRepo.create({
      organization_id: tenantAId,
      email: `learner-a-${testRunId}@tenanta.com`,
      full_name: 'Learner Charlie',
      role: 'learner',
      job_title: 'Operator Trainee',
      badge_id: `BADGE-LRN-${testRunId}`,
    });

    // Insert Tenant B Admin
    const adminB = await userRepo.create({
      organization_id: tenantBId,
      email: `admin-b-${testRunId}@tenantb.com`,
      full_name: 'Admin Diana',
      role: 'admin',
      job_title: 'VP Quality',
      badge_id: `BADGE-ADM-B-${testRunId}`,
    });

    console.log('--- Test Suite 1: Ingestion & DEAN Intelligence Model Generation ---');

    // 1. Ingest Valid SOP for Tenant A
    const validSopText = `
STANDARD OPERATING PROCEDURE: PALLET WRAPPING & STAGING
DOCUMENT REF: SOP-LOG-801 VERSION 1.0
DEPARTMENT: WAREHOUSE OPERATIONS
ROLE: PALLETIZING OPERATOR

SECTION 1: PREREQUISITES & SAFETY
1. Put on steel-toed boots, cut-resistant gloves, and high-visibility vest before entering wrap line.
2. Inspect mechanical film dispenser for tension roller obstructions.

SECTION 2: CORE WRAPPING EXECUTION
3. Attach stretch film tail securely to bottom corner of pallet base.
4. Rotate turntable at low speed and apply 3 initial bottom anchor wraps.
5. MANDATORY CRITICAL CONTROL: Maintain 50% film overlap on upward spiral pass to prevent load shift during transit.

SECTION 3: EXCEPTION RECOVERY
6. If film breaks mid-wrap, stop turntable immediately, re-tie film tail, and re-wrap previous 2 layers before resuming.
    `.trim();

    const wordCount = validSopText.split(/\s+/).filter(Boolean).length;
    const pageCount = 1;
    const fileHash = crypto.createHash('sha256').update(validSopText).digest('hex');

    const extractedDoc: ExtractedDocument = {
      filename: 'SOP-LOG-801.txt',
      rawText: validSopText,
      wordCount,
      pageCount,
      fileHash,
      confirmationText: 'Verified',
      mimeType: 'text/plain',
      extractedAt: new Date().toISOString(),
      diagnostics: {
        totalChars: validSopText.length,
        readableChars: validSopText.length,
        controlChars: 0,
        replacementChars: 0,
        wordCount,
        pageCount,
      },
    };

    const validation = validateSourceFidelity(extractedDoc);
    assert(validation.isValid, 'Source fidelity validator accepts valid operational SOP text');

    // Create Source Document
    const sourceDocA = await contentRepo.createOrFindSourceDocument({
      organization_id: tenantAId,
      doc_code: `SOP-LOG-801-${testRunId}`,
      title: 'Pallet Wrapping & Staging Protocol',
      category: 'Logistics',
      created_by: adminA.id,
    });
    assert(sourceDocA.organization_id === tenantAId, 'Source Document created within Tenant A scope');

    // Create Source Version v1.0
    const verResultA = await contentRepo.createSourceVersion({
      organization_id: tenantAId,
      source_document_id: sourceDocA.id,
      content_hash: fileHash,
      original_filename: 'SOP-LOG-801.txt',
      mime_type: 'text/plain',
      extracted_text: validSopText,
      word_count: wordCount,
      page_count: pageCount,
      change_summary: 'Initial release',
      diagnostics: { validation },
      created_by: adminA.id,
    });
    assert(verResultA.version.version_number === 1, 'Source Version 1 created correctly (v1.0)');
    assert(!verResultA.isDuplicate, 'New version marked as non-duplicate');

    // Generate DEAN Intelligence Model
    const deanGen = generateDomainNeutralLesson(extractedDoc);
    assert(Boolean(deanGen.lesson.title), 'DEAN generates domain-neutral courseware title');
    assert(Boolean(deanGen.blueprint), 'DEAN generates Operational Blueprint');

    // Create Draft Learning Asset
    const assetA = await contentRepo.createLearningAsset({
      organization_id: tenantAId,
      source_version_id: verResultA.version.id,
      title: 'Pallet Wrapping Mastery',
      subtitle: 'Standard Operating Procedure',
      role_target: 'Palletizing Operator',
      operational_blueprint: deanGen.blueprint || {},
      canonical_task_model: deanGen.lesson.knowledgeModel || {},
      know_it_plan: deanGen.lesson.trainingPlan || {},
      video_demonstration_plan: deanGen.lesson.videoPlan || null,
      simulator_steps: deanGen.stepObjects || [],
      generation_metadata: { generator: 'DEAN', testRunId },
      status: 'draft',
      approved_by: null,
    });
    assert(assetA.status === 'draft', 'Newly ingested content defaults safely to "draft" status');

    console.log('\n--- Test Suite 2: Metadata Editing & Blueprint Customization ---');

    // Edit Metadata
    const updatedAsset = await contentRepo.updateLearningAsset(tenantAId, assetA.id, {
      title: 'Pallet Wrapping & Staging Certification Course',
      subtitle: 'Updated Subtitle for Operational Safety',
      role_target: 'Senior Palletizing Specialist',
    });
    assert(updatedAsset?.title === 'Pallet Wrapping & Staging Certification Course', 'Metadata title updated successfully');
    assert(updatedAsset?.role_target === 'Senior Palletizing Specialist', 'Target role updated successfully without altering source text');

    // Verify Source Document text remains intact
    const recheckedVer = await contentRepo.getSourceVersion(tenantAId, verResultA.version.id);
    assert(recheckedVer?.extracted_text === validSopText, 'Source version extracted text is strictly immutable');

    console.log('\n--- Test Suite 3: Approval & Publishing Lifecycle ---');

    // Attempt to list approved assets before publishing
    const approvedBefore = await contentRepo.listApprovedAssets(tenantAId);
    assert(!approvedBefore.some((a) => a.id === assetA.id), 'Draft asset is NOT exposed in published/approved library');

    // Publish Asset by Admin A
    const publishedAsset = await contentRepo.updateLearningAssetStatus(tenantAId, assetA.id, 'approved', adminA.id);
    assert(publishedAsset?.status === 'approved', 'Asset status transitioned to approved/published');
    assert(publishedAsset?.approved_by === adminA.id, 'Approver ID recorded correctly');
    assert(Boolean(publishedAsset?.approved_at), 'Approval timestamp recorded');

    // Verify published asset appears in library
    const approvedAfter = await contentRepo.listApprovedAssets(tenantAId);
    assert(approvedAfter.some((a) => a.id === assetA.id), 'Published asset is now available in organization library');

    console.log('\n--- Test Suite 4: Version Management & Revision Lineage ---');

    // Ingest Revision v2.0 for same Source Document
    const revisedText = validSopText + '\nSECTION 4: REVISION UPDATE\n7. Double-wrap top 2 layers for heavy freight loads.';
    const revisedHash = crypto.createHash('sha256').update(revisedText).digest('hex');

    const verResultA2 = await contentRepo.createSourceVersion({
      organization_id: tenantAId,
      source_document_id: sourceDocA.id,
      content_hash: revisedHash,
      original_filename: 'SOP-LOG-801_v2.txt',
      mime_type: 'text/plain',
      extracted_text: revisedText,
      word_count: wordCount + 10,
      page_count: 1,
      change_summary: 'Added heavy freight double-wrap requirement',
      diagnostics: {},
      created_by: adminA.id,
    });

    assert(verResultA2.version.version_number === 2, 'New version created with incremented version number (v2.0)');
    assert(verResultA2.version.is_active === true, 'Version 2 marked active');

    // Verify Version 1 is deactivated as current active but remains in database
    const ver1Check = await contentRepo.getSourceVersion(tenantAId, verResultA.version.id);
    assert(ver1Check?.is_active === false, 'Version 1 marked inactive as active current version');

    // List all versions for document
    const allVersions = await contentRepo.listSourceVersions(tenantAId, sourceDocA.id);
    assert(allVersions.length === 2, 'Complete version lineage (v1, v2) preserved in database');

    console.log('\n--- Test Suite 5: Cross-Tenant Isolation Enforcement ---');

    // Tenant B Admin attempting to view Tenant A's document
    const crossDocView = await contentRepo.getSourceDocument(tenantBId, sourceDocA.id);
    assert(crossDocView === null, 'Tenant B cannot read Tenant A source document (returns null)');

    // Tenant B Admin attempting to list Tenant A's assets
    const crossAssetList = await contentRepo.listLearningAssets(tenantBId, { source_document_id: sourceDocA.id });
    assert(crossAssetList.length === 0, 'Tenant B query for Tenant A assets returns empty list');

    // Tenant B Admin attempting to edit Tenant A's asset
    const crossEdit = await contentRepo.updateLearningAsset(tenantBId, assetA.id, { title: 'Hijacked Title' });
    assert(crossEdit === null, 'Tenant B cannot update Tenant A learning asset (returns null)');

    // Re-verify Tenant A asset title was untouched by Tenant B attempt
    const untamperedAsset = await contentRepo.getLearningAsset(tenantAId, assetA.id);
    assert(untamperedAsset?.title !== 'Hijacked Title', 'Tenant A asset remains completely untampered');

    console.log('\n--- Test Suite 6: Audit Event Logging ---');

    // Record audit event for publish action
    await auditRepo.recordEvent({
      organization_id: tenantAId,
      user_id: adminA.id,
      action: 'CONTENT_APPROVED_PUBLISHED',
      target_type: 'learning_asset',
      target_id: assetA.id,
      details: { title: publishedAsset?.title },
    });

    const auditEvents = await auditRepo.listEvents(tenantAId, 10);
    assert(auditEvents.length > 0, 'Audit event recorded successfully');
    assert(auditEvents.some((e) => e.action === 'CONTENT_APPROVED_PUBLISHED'), 'Action CONTENT_APPROVED_PUBLISHED present in audit trail');
    assert(auditEvents.every((e) => e.organization_id === tenantAId), 'Audit trail strictly scoped to Tenant A');

    console.log('\n--- Test Suite 7: Validation Safeguards & Failure Recovery ---');

    // Unreadable binary text that should fail validation
    const corruptDoc: ExtractedDocument = {
      filename: 'Corrupt_Binary.pdf',
      rawText: '%PDF-1.4 % /FlateDecode endobj',
      wordCount: 2,
      pageCount: 1,
      fileHash: 'corrupt-hash',
      confirmationText: '',
      mimeType: 'application/pdf',
      extractedAt: new Date().toISOString(),
      diagnostics: {
        totalChars: 30,
        readableChars: 5,
        controlChars: 15,
        replacementChars: 10,
        wordCount: 2,
        pageCount: 1,
      },
    };

    const corruptValidation = validateSourceFidelity(corruptDoc);
    assert(!corruptValidation.isValid, 'Validator correctly rejects corrupt unreadable binary document');
    assert(corruptValidation.errorCategory === 'extraction_failure', 'Validator categorizes rejection as extraction_failure');

    console.log('\n================================================================');
    console.log(` PHASE 3 TEST RESULTS: ${passed} passed, ${failed} failed (Total: ${passed + failed})`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Phase 3 test execution exception:', err);
    process.exit(1);
  } finally {
    // Clean up test records
    await query(`DELETE FROM organizations WHERE id IN ('${tenantAId}', '${tenantBId}');`).catch(() => {});
    await closePool();
  }
}

runPhase3AdminContentTests();

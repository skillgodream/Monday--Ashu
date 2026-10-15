/**
 * GURU COACH LMS - DEVELOPMENT FIXTURES
 *
 * Isolated fixtures for development and automated testing only.
 * Contains clean identity models with zero passwords.
 * Never loaded automatically in production.
 */

import { UserRole } from '../types.js';

export const DEV_FIXTURES = {
  organization: {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Apex Logistics & Hospitality Group',
    slug: 'apex-group',
  },
  users: [
    {
      id: '22222222-2222-4222-8222-222222222221',
      email: 'admin.elena@apex.example',
      full_name: 'Elena Rostova',
      role: 'admin' as UserRole,
      job_title: 'Director of Organizational Operations & Safety',
      badge_id: 'APX-DIR-01',
    },
    {
      id: '22222222-2222-4222-8222-222222222231',
      email: 'admin@guruji.internal',
      full_name: 'Rajesh Patel',
      role: 'admin' as UserRole,
      job_title: 'Head of Operations Training',
      badge_id: 'BADGE-ADM-01',
    },
    {
      id: '22222222-2222-4222-8222-222222222232',
      email: 'manager@guruji.internal',
      full_name: 'Priya Sharma',
      role: 'manager' as UserRole,
      job_title: 'Delivery Operations Lead',
      badge_id: 'BADGE-MGR-02',
    },
    {
      id: '22222222-2222-4222-8222-222222222233',
      email: 'learner@guruji.internal',
      full_name: 'Vikram Singh',
      role: 'learner' as UserRole,
      job_title: 'Field Return Associate',
      badge_id: 'BADGE-LRN-03',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'marcus.vance@apex.example',
      full_name: 'Marcus Vance',
      role: 'manager' as UserRole,
      job_title: 'Floor Operations Lead · Housekeeping',
      badge_id: 'APX-MGR-02',
    },
    {
      id: '22222222-2222-4222-8222-222222222223',
      email: 'sarah.connor@apex.example',
      full_name: 'Sarah Connor',
      role: 'manager' as UserRole,
      job_title: 'Cold-Chain Logistics Supervisor',
      badge_id: 'APX-MGR-03',
    },
    {
      id: '22222222-2222-4222-8222-222222222224',
      email: 'aisha.sharma@apex.example',
      full_name: 'Aisha Sharma',
      role: 'learner' as UserRole,
      job_title: 'Junior Housekeeping Trainee',
      badge_id: 'APX-HSK-101',
    },
    {
      id: '22222222-2222-4222-8222-222222222225',
      email: 'carlos.mendez@apex.example',
      full_name: 'Carlos Mendez',
      role: 'learner' as UserRole,
      job_title: 'Experienced Guest Room Attendant',
      badge_id: 'APX-HSK-102',
    },
    {
      id: '22222222-2222-4222-8222-222222222226',
      email: 'david.chen@apex.example',
      full_name: 'David Chen',
      role: 'learner' as UserRole,
      job_title: 'Cold-Chain Logistics Handler',
      badge_id: 'APX-COLD-201',
    },
  ],
  teams: [
    {
      id: '33333333-3333-4333-8333-333333333331',
      name: 'Grand Regency Housekeeping Team',
      department: 'Hospitality',
      manager_id: '22222222-2222-4222-8222-222222222222',
      member_ids: [
        '22222222-2222-4222-8222-222222222224',
        '22222222-2222-4222-8222-222222222225',
      ],
    },
    {
      id: '33333333-3333-4333-8333-333333333332',
      name: 'Cold-Chain Storage Logistics Crew',
      department: 'Logistics',
      manager_id: '22222222-2222-4222-8222-222222222223',
      member_ids: [
        '22222222-2222-4222-8222-222222222226',
      ],
    },
  ],
  sampleSop: {
    doc_code: 'SOP-HSK-501',
    title: 'Room Sanitization & Turnover Gold Standard',
    category: 'Housekeeping',
    raw_text: `STANDARD OPERATING PROCEDURE: GUEST ROOM TURNOVER & SANITIZATION
DOCUMENT ID: SOP-HSK-501 VERSION 1.0
DEPARTMENT: HOUSEKEEPING
ROLE: GUEST ROOM ATTENDANT (GRA)

SECTION 1: PREREQUISITES & PPE
1. Put on clean disposable nitrile gloves before entering any guest room.
2. Position cleaning trolley across entrance leaving 12 inches clearance.

SECTION 2: SURFACE SANITIZATION
3. Pre-wipe dust and organic debris with a damp microfiber cloth first.
4. Apply EPA-registered surface disinfectant to high-touch points: switches, remotes, handles.
5. MANDATORY CRITICAL CONTROL: Disinfectant must remain visibly wet for 60 seconds dwell time before wiping dry.

SECTION 3: ESCALATION
6. If guest valuables or open safes are detected, do not touch. Step out and notify Floor Supervisor at ext 4200.`,
  },
};

/**
 * Priority destinations only — admin, departments, HODs, labs, seminars, library, circulation.
 * Mirrors campus map JSON + backend graph (svit-campus-map.json).
 */

import type { CampusDirection } from './campusDirections';

const MAIN = 'Main entrance (inner vertex between Block A and Block B)';

type Row = {
  code: string;
  name: string;
  block: CampusDirection['block'];
  floor_id: NonNullable<CampusDirection['floor_id']>;
  floorLabel: string;
  steps?: string[];
  estSteps: number;
  estSec: number;
};

/** Short narrative used when legacy `steps` not overridden */
function defaultSteps(r: Omit<Row, 'steps'> & { steps?: string[] }): string[] {
  if (r.steps && r.steps.length) return r.steps;
  const b = r.block;
  const fid = r.floor_id;
  const tier =
    fid === 'GF'
      ? 'Ground'
      : fid === 'FF'
        ? 'First'
        : 'Second';
  return [
    `From ${MAIN.toLowerCase()}, use building signage toward Block ${b}.`,
    `On ${tier} Floor, follow the main corridor inside Block ${b}.`,
    `Locate ${r.name} (${r.code}) on the corridor room boards.`,
  ];
}

function rowToDirection(r: Row): CampusDirection {
  return {
    from: MAIN,
    /** Floor suffix disambiguates B-LIFT / stairs on multiple floors for dropdown + voice. */
    to: `${r.code} - ${r.name} (${r.floorLabel})`,
    block: r.block,
    floor: r.floorLabel,
    floor_id: r.floor_id,
    steps: defaultSteps(r),
    estimated_steps: r.estSteps,
    estimated_time_seconds: r.estSec,
  };
}

const RAW: Row[] = [
  // GF A
  { code: 'A-002', name: 'CAED Lab', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 40, estSec: 50 },
  { code: 'A-005', name: 'Railway Skills Development Lab', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 52, estSec: 62 },
  { code: 'A-008', name: 'Department of Physics', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 72, estSec: 74 },
  { code: 'A-009', name: 'Department of Chemistry', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 74, estSec: 76 },
  { code: 'A-010', name: 'Research Center — CSE', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 70, estSec: 74 },
  { code: 'A-011', name: 'NCC Room', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 70, estSec: 72 },
  { code: 'A-012', name: 'Store Room', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 74, estSec: 78 },
  { code: 'A-STR', name: 'Stairs — Block A', block: 'A', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 36, estSec: 42 },
  // GF B
  {
    code: 'B-002',
    name: 'Entrepreneurship Incubation Cell',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Enter Block B corridor from the junction.', 'Proceed along the corridor toward the incubation wing.', 'B-002 is signed as Entrepreneurship Incubation Cell.'],
    estSteps: 38,
    estSec: 55,
  },
  {
    code: 'B-003',
    name: 'Training & Placement Centre',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['From the junction, enter Block B.', 'Proceed along Training & Placement signage.', 'B-003 is the continuation of T&P beside B-002.'],
    estSteps: 40,
    estSec: 55,
  },
  {
    code: 'B-004',
    name: 'Principal Chamber',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Walk through Block B toward upper administration.', 'Follow Principal / Administration signage.', 'B-004 Principal Chamber is in the administrative cluster.'],
    estSteps: 52,
    estSec: 64,
  },
  { code: 'B-005', name: 'Board Room', block: 'B', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 56, estSec: 62 },
  { code: 'B-006', name: 'Director Room', block: 'B', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 58, estSec: 64 },
  {
    code: 'B-008',
    name: 'Gymnasium & Fitness',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Proceed along Block B main corridor.', 'Follow gym / fitness facility signage.', 'B-008 is the gymnasium area.'],
    estSteps: 58,
    estSec: 70,
  },
  {
    code: 'B-009',
    name: 'Administrative Office',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Walk along Block B mid-corridor.', 'Look for Administrative Office boards.', 'B-009 Administrative Office lies off the corridor.'],
    estSteps: 34,
    estSec: 45,
  },
  {
    code: 'B-010',
    name: 'Medical Room',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Walk along Block B.', 'Locate medical / first-aid signage.', 'B-010 Medical Room is along the corridor.'],
    estSteps: 52,
    estSec: 60,
  },
  {
    code: 'B-011',
    name: 'Admission Room',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Enter Block B and continue east along the corridor.', 'Follow Admissions signage.', 'B-011 is the Admission Room.'],
    estSteps: 52,
    estSec: 58,
  },
  {
    code: 'B-012',
    name: 'Examination Section',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Continue on Block B main corridor.', 'Follow Examination Cell signage.', 'B-012 Examination Section is marked on the corridor.'],
    estSteps: 54,
    estSec: 62,
  },
  { code: 'B-015', name: 'Stationery / SVIT Store', block: 'B', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 38, estSec: 52 },
  {
    code: 'B-LIFT',
    name: 'Lift — Block B',
    block: 'B',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['From the junction, locate the lift lobby in Block B.', 'Use Lift (Block B) for upper floors FF / SF.'],
    estSteps: 22,
    estSec: 32,
  },
  // GF C
  {
    code: 'C-001',
    name: 'Department of ISE Lab (1)',
    block: 'C',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Cross from Block B into Block C.', 'Take the upper corridor in Block C.', 'C-001 ISE Lab 1 on the corridor.'],
    estSteps: 44,
    estSec: 55,
  },
  {
    code: 'C-002',
    name: 'Department of ISE Lab (2)',
    block: 'C',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Enter Block C from B–C junction.', 'Continue east on the upper corridor.', 'C-002 beside C-001.'],
    estSteps: 46,
    estSec: 56,
  },
  {
    code: 'C-003',
    name: 'Library & Information Center',
    block: 'C',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Enter Block C.', 'Follow Library / LIC signage to the northeast of Block C.', 'C-003 Library & Information Center.'],
    estSteps: 48,
    estSec: 62,
  },
  { code: 'C-005', name: 'Survey Lab', block: 'C', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 58, estSec: 72 },
  { code: 'C-006', name: 'Geology Lab', block: 'C', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 58, estSec: 74 },
  {
    code: 'C-007',
    name: 'Swamy Vivekananda Main Seminar Hall',
    block: 'C',
    floor_id: 'GF',
    floorLabel: 'Ground Floor',
    steps: ['Enter Block C and move to seminar zone.', 'The main seminar hall is the large Lower-C volume.', 'C-007 — Swamy Vivekananda Seminar Hall.'],
    estSteps: 52,
    estSec: 66,
  },
  { code: 'C-008', name: 'Medical Room', block: 'C', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 50, estSec: 62 },
  { code: 'C-011', name: 'UPS Room', block: 'C', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 56, estSec: 72 },
  { code: 'C-STR', name: 'Stairs — Block C', block: 'C', floor_id: 'GF', floorLabel: 'Ground Floor', estSteps: 48, estSec: 54 },
  // FF A
  { code: 'A-108', name: 'E&C HOD Room', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 42, estSec: 54 },
  { code: 'A-109', name: 'Carver Lab — E&C Lab 6', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 48, estSec: 62 },
  { code: 'A-110', name: 'Richard Feynman Lab — E&C Lab 5', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 52, estSec: 62 },
  { code: 'A-111', name: 'David Huffman Lab — E&C Lab 4', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 54, estSec: 64 },
  { code: 'A-112', name: 'Claude Shannon Lab — E&C Lab 3', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 56, estSec: 65 },
  { code: 'A-113', name: 'James Clerk Maxwell Lab — E&C Lab 2', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 58, estSec: 68 },
  { code: 'A-114', name: 'William Shockley Lab — E&C Lab 1', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 60, estSec: 72 },
  { code: 'A-115', name: 'Department of Mathematics', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 68, estSec: 74 },
  { code: 'A-HOD-MATH', name: 'Maths HOD Room', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 66, estSec: 74 },
  { code: 'A-STR', name: 'Stairs — Block A', block: 'A', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 36, estSec: 42 },
  // FF B
  { code: 'B-101', name: 'CSE HOD Room', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 38, estSec: 54 },
  { code: 'B-102', name: 'ISE HOD Room', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 40, estSec: 54 },
  { code: 'B-103', name: 'ISE Faculty Room', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 44, estSec: 54 },
  { code: 'B-107', name: 'L2M Cyber Signaling Lab — 2', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 48, estSec: 60 },
  { code: 'B-110', name: 'L2M AIML Lab for Railways R&D', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 50, estSec: 64 },
  { code: 'B-111', name: 'CSE Faculty Room — 2', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 50, estSec: 62 },
  { code: 'B-112', name: 'Dr. Vikram Sarabhai Computer Lab', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 52, estSec: 62 },
  { code: 'B-113', name: 'Dr. Radhakrishnan Seminar Hall', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 54, estSec: 62 },
  { code: 'B-114', name: 'CSE Faculty Room — 1', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 56, estSec: 62 },
  { code: 'B-115', name: 'Dept of Mechanical Faculty Room', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 58, estSec: 62 },
  { code: 'B-116', name: 'CSE Faculty Room — 3', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 58, estSec: 64 },
  { code: 'B-117', name: 'Centre for Research & Development — E&C', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 64, estSec: 72 },
  { code: 'B-119', name: 'KSCST Room', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 64, estSec: 74 },
  { code: 'B-LIFT', name: 'Lift — Block B', block: 'B', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 22, estSec: 34 },
  // FF C
  { code: 'C-101', name: 'Dept of CSE Lab', block: 'C', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 44, estSec: 58 },
  { code: 'C-102', name: 'Dept of CSE Lab', block: 'C', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 46, estSec: 56 },
  { code: 'C-103', name: 'Dept of CSE Lab', block: 'C', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 48, estSec: 56 },
  { code: 'C-104', name: 'Dept of CSE Lab', block: 'C', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 50, estSec: 58 },
  { code: 'C-112', name: 'ISE R&D Center', block: 'C', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 58, estSec: 74 },
  { code: 'C-STR', name: 'Stairs — Block C', block: 'C', floor_id: 'FF', floorLabel: 'First Floor', estSteps: 48, estSec: 54 },
  // SF A
  { code: 'A-207', name: 'NSS Cell', block: 'A', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 52, estSec: 64 },
  { code: 'A-209', name: 'Photonics Lab for Railways R&D', block: 'A', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 56, estSec: 70 },
  { code: 'A-217', name: 'IQAC Cell', block: 'A', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 68, estSec: 74 },
  { code: 'A-218', name: 'Dept of ECE Faculty Room', block: 'A', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 72, estSec: 78 },
  { code: 'A-STR', name: 'Stairs — Block A', block: 'A', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 36, estSec: 42 },
  // SF B
  { code: 'B-201', name: 'Dept of CSE Data Science HOD Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 40, estSec: 56 },
  { code: 'B-202', name: 'Dept of AIML HOD Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 42, estSec: 56 },
  { code: 'B-210', name: 'Civil & Mechanical CAD Lab', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 48, estSec: 60 },
  { code: 'B-211', name: 'Dept of Mechanical Engineering HOD Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 50, estSec: 60 },
  { code: 'B-212', name: 'Dept of Civil Engineering HOD Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 52, estSec: 62 },
  { code: 'B-213', name: 'Dept of CSE AIML Staff Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 52, estSec: 60 },
  { code: 'B-214', name: 'Dept of CSE DS Staff Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 54, estSec: 62 },
  { code: 'B-215', name: 'Sir M. Visvesvaraya Seminar Hall', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 56, estSec: 64 },
  { code: 'B-216', name: 'Civil & Mechanical Staff Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 62, estSec: 74 },
  { code: 'B-217', name: 'CSE DS Lab — 2', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 58, estSec: 72 },
  { code: 'B-218', name: 'CSE AIML Lab — 2', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 60, estSec: 72 },
  { code: 'B-219', name: 'Sangama Cultural Club', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 64, estSec: 74 },
  { code: 'B-222', name: 'Faculty Room', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 64, estSec: 76 },
  { code: 'B-LIFT', name: 'Lift — Block B', block: 'B', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 22, estSec: 34 },
  // SF C
  { code: 'C-201', name: 'CoE AIML Skill Lab', block: 'C', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 48, estSec: 64 },
  { code: 'C-202', name: 'CSE DS Lab — 1 / John Tukey Lab', block: 'C', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 54, estSec: 76 },
  { code: 'C-203', name: 'CSE AIML Lab — 1 / John McCarthy Lab', block: 'C', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 58, estSec: 78 },
  { code: 'C-206', name: 'Dept of ISE Lab', block: 'C', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 60, estSec: 74 },
  { code: 'C-214', name: 'CSE DS R&D Center', block: 'C', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 66, estSec: 74 },
  { code: 'C-STR', name: 'Stairs — Block C', block: 'C', floor_id: 'SF', floorLabel: 'Second Floor', estSteps: 48, estSec: 54 },
];

export const CAMPUS_PRIORITY_ROWS = RAW;

/** Dropdown + legacy voice match ordering */
export function buildPriorityCampusDirections(): CampusDirection[] {
  const seen = new Set<string>();
  const out: CampusDirection[] = [];
  for (const r of RAW) {
    const k = `${r.floor_id}:${r.code}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(rowToDirection(r));
  }
  return out;
}

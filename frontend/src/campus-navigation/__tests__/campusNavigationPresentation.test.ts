/**
 * Campus navigation presentation helpers — destination → floor / direction.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import campusMapJson from '../../data/svit-campus-map.json';
import {
  CAMPUS_DIRECTIONS,
  CAMPUS_LANGUAGE_LABELS,
  campusDirectionFromMapMatch,
} from '../index';
import { campusSpeechText, localizedCampusSteps } from '../campusDirections';
import type { CampusMapData, CampusMatchApiRoom } from '../campusMapTypes';
import type { Language } from '../../context/LanguageContext';

const MAP = campusMapJson as unknown as CampusMapData;
const LANGUAGES: Language[] = ['English', 'Kannada', 'Hindi', 'Telugu', 'Tamil', 'Malayalam'];
const SCRIPT_RANGES: Record<Exclude<Language, 'English'>, RegExp> = {
  Kannada: /[\u0C80-\u0CFF]/,
  Hindi: /[\u0900-\u097F]/,
  Telugu: /[\u0C00-\u0C7F]/,
  Tamil: /[\u0B80-\u0BFF]/,
  Malayalam: /[\u0D00-\u0D7F]/,
};

describe('campus map JSON sources', () => {
  it('keeps src/data and public/data maps byte-identical', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const srcMap = path.resolve(here, '../../data/svit-campus-map.json');
    const publicMap = path.resolve(here, '../../../public/data/svit-campus-map.json');
    expect(readFileSync(srcMap)).toEqual(readFileSync(publicMap));
  });
});

describe('campusDirectionFromMapMatch', () => {
  it('maps ground-floor library destination', () => {
    const room: CampusMatchApiRoom = {
      code: 'C-003',
      name: 'Library & Information Center',
      floor_id: 'GF',
      floor_name: 'Ground Floor',
      block_code: 'C',
    };
    const direction = campusDirectionFromMapMatch(room);
    expect(direction.floor_id).toBe('GF');
    expect(direction.to).toContain('C-003');
  });

  it('maps first-floor CSE HOD destination', () => {
    const room: CampusMatchApiRoom = {
      code: 'B-101',
      name: 'CSE HOD Room',
      floor_id: 'FF',
      floor_name: 'First Floor',
      block_code: 'B',
    };
    const direction = campusDirectionFromMapMatch(room);
    expect(direction.floor_id).toBe('FF');
    expect(direction.block).toBe('B');
  });

  it('maps second-floor mechanical lab destination', () => {
    const room: CampusMatchApiRoom = {
      code: 'B-210',
      name: 'Civil & Mechanical CAD Lab',
      floor_id: 'SF',
      floor_name: 'Second Floor',
      block_code: 'B',
    };
    const direction = campusDirectionFromMapMatch(room);
    expect(direction.floor_id).toBe('SF');
    expect(direction.to.toLowerCase()).toContain('mechanical');
  });

  it('adapts all 150 canonical map rooms with the exact floor and code', () => {
    const rooms = MAP.floors.flatMap((floor) =>
      floor.blocks.flatMap((block) =>
        block.rooms.map((room) => ({ room, floor, block })),
      ),
    );
    expect(rooms).toHaveLength(150);
    expect(CAMPUS_DIRECTIONS).toHaveLength(150);
    expect(new Set(rooms.map(({ room }) => room.id)).size).toBe(150);

    for (const { room, floor, block } of rooms) {
      const direction = campusDirectionFromMapMatch({
        id: room.id,
        code: room.code,
        name: room.name,
        floor_id: floor.floor_id,
        floor_name: floor.floor_name,
        block_code: block.block_code,
      });
      expect(direction.to, room.id).toContain(room.code);
      expect(direction.floor_id, room.id).toBe(floor.floor_id);
      expect(direction.block, room.id).toBe(block.block_code);
    }
  });
});

describe('six-language navigation presentation', () => {
  const requiredLabels = [
    'campusNavigation', 'destination', 'directions', 'floorTabGFFull',
    'floorTabFFFull', 'floorTabSFFull', 'campusMapLegendRoute',
    'campusMapLegendLift', 'campusEtaShort', 'campusDistanceShort',
    'campusModeShortest', 'campusStartOver', 'campusRepeat',
    'campusChangeDestination', 'campusKioskDirectory', 'campusKioskHelp',
  ];

  it('defines native visible navigation labels without English fallback', () => {
    for (const language of LANGUAGES.filter((item) => item !== 'English') as Exclude<Language, 'English'>[]) {
      const labels = CAMPUS_LANGUAGE_LABELS[language];
      for (const key of requiredLabels) {
        expect(labels[key], `${language}:${key}`).toBeTruthy();
        expect(labels[key], `${language}:${key}`).not.toBe(CAMPUS_LANGUAGE_LABELS.English[key]);
        expect(SCRIPT_RANGES[language].test(labels[key]), `${language}:${key}`).toBe(true);
      }
    }
  });

  it('localizes deterministic route directions and speech in the selected session language', () => {
    const upperFloor = CAMPUS_DIRECTIONS.find((direction) => direction.floor_id === 'SF')!;
    for (const language of LANGUAGES) {
      const steps = localizedCampusSteps(upperFloor, language);
      const speech = campusSpeechText(upperFloor, language);
      expect(steps.length, language).toBeGreaterThanOrEqual(5);
      expect(speech, language).toContain('NSS Cell');
      if (language !== 'English') {
        expect(steps.some((step) => SCRIPT_RANGES[language].test(step)), language).toBe(true);
        expect(SCRIPT_RANGES[language].test(speech), language).toBe(true);
        expect(steps.join(' '), language).not.toContain('Take the lift to the');
      }
    }
  });
});

describe('normalizeCardTrigger campus navigation', () => {
  // Mirror ChatScreen normalizeCardTrigger aliases without mounting React.
  function normalizeCardTrigger(trigger: unknown): string | null {
    if (typeof trigger !== 'string') return null;
    const n = trigger.trim().toLowerCase();
    if (!n) return null;
    if (n === 'campus_navigation' || n === 'campus_nav' || n === 'navigation') {
      return 'campus_navigation';
    }
    return n;
  }

  it('normalizes campus navigation showCard aliases', () => {
    expect(normalizeCardTrigger('campus_navigation')).toBe('campus_navigation');
    expect(normalizeCardTrigger('campus_nav')).toBe('campus_navigation');
    expect(normalizeCardTrigger('navigation')).toBe('campus_navigation');
  });
});

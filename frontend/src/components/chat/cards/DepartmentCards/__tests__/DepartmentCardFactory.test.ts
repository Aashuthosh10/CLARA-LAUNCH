import { describe, expect, it } from 'vitest';
import { hasDedicatedDepartmentFactoryCard } from '../DepartmentCardFactory';

describe('DepartmentCardFactory cse_bs mapping', () => {
  it('uses a dedicated Business Systems card instead of the CSE fallback', () => {
    expect(hasDedicatedDepartmentFactoryCard('CSE (Business Systems)')).toBe(true);
    expect(hasDedicatedDepartmentFactoryCard('CSE')).toBe(true);
    expect(hasDedicatedDepartmentFactoryCard('cse_bs')).toBe(false);
  });
});

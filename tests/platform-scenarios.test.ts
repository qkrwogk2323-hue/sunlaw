import { describe, expect, it } from 'vitest';
import {
  PLATFORM_SCENARIO_ORGANIZATIONS,
  getPlatformScenarioModeByOrganizationId,
  getPlatformScenarioOrganizationById
} from '@/lib/platform-scenarios';

describe('platform scenario organizations', () => {
  it('uses stable UUID-backed organization ids for all scenario entries', () => {
    const organizations = Object.values(PLATFORM_SCENARIO_ORGANIZATIONS);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(new Set(organizations.map((organization) => organization.id)).size).toBe(organizations.length);

    for (const organization of organizations) {
      expect(organization.id).toMatch(uuidPattern);
      expect(organization.name).toContain('(가상조직)');
      expect(organization.slug).toBeTruthy();
    }
  });

  it('maps scenario organization ids back to the correct scenario mode', () => {
    expect(getPlatformScenarioModeByOrganizationId(PLATFORM_SCENARIO_ORGANIZATIONS.law_admin.id)).toBe('law_admin');
    expect(getPlatformScenarioModeByOrganizationId(PLATFORM_SCENARIO_ORGANIZATIONS.collection_admin.id)).toBe('collection_admin');
    expect(getPlatformScenarioModeByOrganizationId(PLATFORM_SCENARIO_ORGANIZATIONS.other_admin.id)).toBe('other_admin');
    expect(getPlatformScenarioModeByOrganizationId('99999999-9999-4999-8999-999999999999')).toBeNull();
  });

  it('resolves organization records by UUID-backed id', () => {
    expect(getPlatformScenarioOrganizationById(PLATFORM_SCENARIO_ORGANIZATIONS.law_admin.id)?.slug).toBe('saeon-garam-beop');
    expect(getPlatformScenarioOrganizationById(PLATFORM_SCENARIO_ORGANIZATIONS.collection_admin.id)?.slug).toBe('nuri-chaeum-won');
    expect(getPlatformScenarioOrganizationById(PLATFORM_SCENARIO_ORGANIZATIONS.other_admin.id)?.slug).toBe('daon-haneul-lab');
    expect(getPlatformScenarioOrganizationById('99999999-9999-4999-8999-999999999999')).toBeNull();
  });
});

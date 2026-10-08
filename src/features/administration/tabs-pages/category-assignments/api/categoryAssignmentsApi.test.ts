import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCategoryAssignment,
  deactivateCategoryAssignment,
  fetchCategoryAssignments,
  updateCategoryAssignment,
} from './categoryAssignmentsApi';

const originalFetch = global.fetch;

function mockFetch(data: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: 'success', data }), { status: 200 })
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const lastCall = (fetchMock: ReturnType<typeof vi.fn>) => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, method: init.method, body: init.body ? JSON.parse(init.body as string) : undefined };
};

describe('categoryAssignmentsApi', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists assignments, leaving out unset filters', async () => {
    const fetchMock = mockFetch({ assignments: [], pagination: {} });
    await fetchCategoryAssignments({ page_size: 20, department: 'Ministry of Agriculture', active: undefined });
    const { url, method } = lastCall(fetchMock);
    expect(method).toBe('GET');
    expect(url).toContain('/api/proxy/api/v1/category-assignments?page_size=20&department=Ministry+of+Agriculture');
  });

  it('creates, updates and deactivates by assignment id', async () => {
    const fetchMock = mockFetch({ assignment: {} });

    await createCategoryAssignment({
      service_category: 'Inputs',
      department: 'Ministry of Agriculture',
      l1_officer: 'officer1@test.com',
      sla_days: 7,
    });
    expect(lastCall(fetchMock)).toMatchObject({
      method: 'POST',
      body: { service_category: 'Inputs', department: 'Ministry of Agriculture', l1_officer: 'officer1@test.com', sla_days: 7 },
    });
    expect(lastCall(fetchMock).url).toMatch(/\/api\/v1\/category-assignments$/);

    await updateCategoryAssignment('GR-RBAC-00001', { l2_officer: null });
    expect(lastCall(fetchMock)).toMatchObject({ method: 'PATCH', body: { l2_officer: null } });
    expect(lastCall(fetchMock).url).toContain('/api/v1/category-assignments/GR-RBAC-00001');

    await deactivateCategoryAssignment('GR-RBAC-00001');
    expect(lastCall(fetchMock)).toMatchObject({ method: 'DELETE' });
  });
});

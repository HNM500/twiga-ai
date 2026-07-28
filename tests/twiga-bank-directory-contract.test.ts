import { describe, expect, test } from 'bun:test';
import { normalizeDirectoryResponse } from '../lib/twiga-core/bank-directory-contract';

describe('Twiga bank directory response contract', () => {
  test('preserves an explicit full total beyond a limited search page', () => {
    const response = normalizeDirectoryResponse({
      results: [{ canonical_name: 'Example Bank' }],
      count: 1,
      total: 46,
      hasMore: true,
    });
    expect(response.results).toHaveLength(1);
    expect(response.total).toBe(46);
    expect(response.hasMore).toBe(true);
  });

  test('recognizes a complete compact catalog', () => {
    const results = Array.from({ length: 46 }, (_, index) => ({ canonical_name: `Bank ${index + 1}` }));
    const response = normalizeDirectoryResponse({ results, count: 46, total: 46, hasMore: false });
    expect(response.count).toBe(46);
    expect(response.total).toBe(46);
    expect(response.hasMore).toBe(false);
  });

  test('derives safe metadata for older responses', () => {
    const response = normalizeDirectoryResponse({ results: [{ canonical_name: 'Example Bank' }] });
    expect(response).toEqual({
      results: [{ canonical_name: 'Example Bank' }],
      count: 1,
      total: 1,
      hasMore: false,
    });
  });
});

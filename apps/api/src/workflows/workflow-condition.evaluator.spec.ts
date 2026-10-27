import { describe, expect, it } from 'vitest';
import { evaluateConditions } from './workflow-condition.evaluator.js';

describe('evaluateConditions', () => {
  it('matches when there are no conditions', () => {
    expect(evaluateConditions(undefined, { priority: 'LOW' })).toBe(true);
    expect(evaluateConditions([], { priority: 'LOW' })).toBe(true);
  });

  it('evaluates an equals condition', () => {
    const conditions = [{ field: 'priority', operator: 'equals', value: 'CRITICAL' }];
    expect(evaluateConditions(conditions, { priority: 'CRITICAL' })).toBe(true);
    expect(evaluateConditions(conditions, { priority: 'LOW' })).toBe(false);
  });

  it('evaluates a notEquals condition', () => {
    const conditions = [{ field: 'status', operator: 'notEquals', value: 'CLOSED' }];
    expect(evaluateConditions(conditions, { status: 'OPEN' })).toBe(true);
    expect(evaluateConditions(conditions, { status: 'CLOSED' })).toBe(false);
  });

  it('evaluates in / notIn conditions against arrays', () => {
    const inCond = [{ field: 'priority', operator: 'in', value: ['HIGH', 'CRITICAL'] }];
    expect(evaluateConditions(inCond, { priority: 'HIGH' })).toBe(true);
    expect(evaluateConditions(inCond, { priority: 'LOW' })).toBe(false);

    const notInCond = [{ field: 'priority', operator: 'notIn', value: ['LOW'] }];
    expect(evaluateConditions(notInCond, { priority: 'HIGH' })).toBe(true);
    expect(evaluateConditions(notInCond, { priority: 'LOW' })).toBe(false);
  });

  it('combines multiple conditions with AND semantics', () => {
    const conditions = [
      { field: 'priority', operator: 'equals', value: 'CRITICAL' },
      { field: 'status', operator: 'equals', value: 'OPEN' },
    ];
    expect(evaluateConditions(conditions, { priority: 'CRITICAL', status: 'OPEN' })).toBe(true);
    expect(evaluateConditions(conditions, { priority: 'CRITICAL', status: 'CLOSED' })).toBe(false);
  });

  it('reads nested fields via dot-path', () => {
    const conditions = [{ field: 'category.name', operator: 'equals', value: 'Network' }];
    expect(evaluateConditions(conditions, { category: { name: 'Network' } })).toBe(true);
    expect(evaluateConditions(conditions, { category: { name: 'Hardware' } })).toBe(false);
  });
});

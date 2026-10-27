export type ConditionOperator = 'equals' | 'notEquals' | 'in' | 'notIn';

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

function getField(record: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);
}

function evaluateOne(condition: WorkflowCondition, subject: Record<string, unknown>): boolean {
  const actual = getField(subject, condition.field);

  switch (condition.operator) {
    case 'equals':
      return actual === condition.value;
    case 'notEquals':
      return actual !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case 'notIn':
      return Array.isArray(condition.value) && !condition.value.includes(actual);
    default:
      return false;
  }
}

/**
 * Conditions are stored as a JSON array and combined with AND semantics.
 * An empty/missing condition list always matches — this is how a workflow
 * can trigger on every event of its trigger type with no extra filtering.
 */
export function evaluateConditions(
  conditions: unknown,
  subject: Record<string, unknown>,
): boolean {
  if (!conditions) return true;
  const list = Array.isArray(conditions) ? conditions : [conditions];
  return (list as WorkflowCondition[]).every((condition) => evaluateOne(condition, subject));
}

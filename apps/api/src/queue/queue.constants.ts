export const NOTIFICATIONS_QUEUE = 'notifications';
export const WORKFLOWS_QUEUE = 'workflows';

export enum NotificationsJob {
  SEND_EMAIL = 'send-email',
}

export enum WorkflowsJob {
  EVALUATE_TRIGGER = 'evaluate-trigger',
}

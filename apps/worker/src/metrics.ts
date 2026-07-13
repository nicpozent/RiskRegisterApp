import client from 'prom-client';

// Prometheus registry for the worker: default process/runtime metrics plus
// notification-pipeline counters/gauges. Labels are low-cardinality (fixed
// outcome set) so this is safe to scrape at any interval.
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const notificationsProcessed = new client.Counter({
  name: 'worker_notifications_processed_total',
  help: 'Notifications processed, by outcome',
  labelNames: ['outcome'] as const, // sent | failed | retried
  registers: [registry],
});

export const pollTotal = new client.Counter({
  name: 'worker_poll_total',
  help: 'Queue poll cycles started',
  registers: [registry],
});

export const pollErrors = new client.Counter({
  name: 'worker_poll_errors_total',
  help: 'Poll cycles that threw before completing',
  registers: [registry],
});

export const queueDepth = new client.Gauge({
  name: 'worker_notification_queue_depth',
  help: 'Notifications still queued awaiting send (sampled each poll)',
  registers: [registry],
});

export const lastRun = new client.Gauge({
  name: 'worker_last_run_timestamp_seconds',
  help: 'Unix time of the last completed poll cycle (staleness / liveness signal)',
  registers: [registry],
});

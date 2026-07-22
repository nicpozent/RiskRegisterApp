// OpenTelemetry distributed tracing — vendor-neutral, opt-in.
//
// Enabled only when OTEL_EXPORTER_OTLP_ENDPOINT is set (point it at any OTLP
// collector — Tempo, Jaeger, a SaaS). When unset this is a no-op with zero
// runtime cost, so it is safe to ship enabled-by-config. Auto-instruments HTTP,
// Express and pg; spans carry the same request context the logs correlate on.
//
// Imported FIRST in index.ts so the instrumentations patch http/express/pg
// before those modules are required.
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

let provider: NodeTracerProvider | undefined;

function start(serviceName: string) {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return; // opt-in
  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? serviceName }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  provider.register();
  registerInstrumentations({
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation(), new PgInstrumentation()],
  });
  console.log(`OpenTelemetry tracing enabled → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
}

export async function stopTracing() {
  await provider?.shutdown();
}

start('rr-api');

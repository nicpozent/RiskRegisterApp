// OpenTelemetry distributed tracing for the worker — opt-in, vendor-neutral.
// Enabled only when OTEL_EXPORTER_OTLP_ENDPOINT is set; no-op otherwise.
// Auto-instruments pg and outbound HTTP (MS Graph). Imported first in index.ts.
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

let provider: NodeTracerProvider | undefined;

function start(serviceName: string) {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return; // opt-in
  provider = new NodeTracerProvider({
    resource: new Resource({ [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? serviceName }),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  provider.register();
  registerInstrumentations({ instrumentations: [new HttpInstrumentation(), new PgInstrumentation()] });
  console.log(`OpenTelemetry tracing enabled → ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
}

export async function stopTracing() {
  await provider?.shutdown();
}

start('rr-worker');

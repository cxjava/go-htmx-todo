// Import OpenTelemetry dependencies
import { context, trace } from '@opentelemetry/api';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
// import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Set up the OpenTelemetry provider
const providerWithZone = new WebTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'htmx-web-service'
  }),
  // resource: new Resource({
  //   [ATTR_SERVICE_NAME]: 'htmx-web-service',
  // }),
  spanProcessors: [
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
    // Uncomment the following line to send traces to an OTLP endpoint
    // new SimpleSpanProcessor(new OTLPTraceExporter({
    //   url: 'http://localhost:4318/v1/traces'
    // })),
  ]
});

// Register the provider with the appropriate context manager and propagator
providerWithZone.register({
  contextManager: new ZoneContextManager(),
  propagator: new B3Propagator(),
});

// Register XMLHttpRequest instrumentation
registerInstrumentations({
  instrumentations: [
    new XMLHttpRequestInstrumentation({
      ignoreUrls: [/localhost:8090\/sockjs-node/],
      propagateTraceHeaderCorsUrls: [
        /.+/,  // Propagate trace headers for all URLs
      ],
    }),
  ],
});

// Get the tracer for creating spans
const webTracerWithZone = providerWithZone.getTracer('htmx-tracer-web');

// Function to initialize HTMX tracing when the document is loaded
function initializeHtmxTracing() {
  // Wait for HTMX to be available
  const waitForHtmx = () => {
    if (typeof window.htmx !== 'undefined') {
      setupHtmxTracing();
    } else {
      console.log('Waiting for HTMX to load...');
      setTimeout(waitForHtmx, 100);
    }
  };

  waitForHtmx();
}

// Set up HTMX event listeners for tracing
function setupHtmxTracing() {
  // Before request starts
  htmx.on('htmx:beforeRequest', (event) => {
    const { elt, xhr, target } = event.detail;
    console.log(`HTMX request event.detail: ${event.detail}`);
    console.log(event.detail);
    console.log(xhr);
    console.log(xhr);
    
    // Create a new span for the HTMX request
    const requestSpan = webTracerWithZone.startSpan(`htmx-request-${xhr.url || 'unknown'}`);
    
    // Add attributes to the span
    requestSpan.setAttribute('htmx.trigger.id', elt.id || 'unnamed-element');
    requestSpan.setAttribute('htmx.trigger.class', elt.className || 'no-class');
    requestSpan.setAttribute('htmx.target.id', target.id || 'unnamed-target');
    requestSpan.setAttribute('htmx.method', xhr.method || 'GET');
    requestSpan.setAttribute('htmx.url', xhr.url || 'unknown');
    
    // Store the span on the xhr object to retrieve it later
    xhr._otelSpan = requestSpan;
    
    // Use the active context + span for any operations
    context.with(trace.setSpan(context.active(), requestSpan), () => {
      // Add an event to mark the start of the request
      trace.getSpan(context.active()).addEvent('htmx-request-start', {
        'htmx.trigger': elt.outerHTML.substring(0, 100) // First 100 chars of the element HTML
      });
    });

    console.log(`HTMX request started: ${xhr.method} ${xhr.url}`);
  });
  
  // After request completes successfully
  htmx.on('htmx:afterRequest', (event) => {
    const { xhr } = event.detail;
    
    // Retrieve the span from the xhr object
    const requestSpan = xhr._otelSpan;
    if (requestSpan) {
      // Add an event for request completion
      requestSpan.addEvent('htmx-request-complete', {
        'htmx.status': xhr.status,
        'htmx.success': true
      });
      
      // End the span
      requestSpan.end();
      console.log(`HTMX request completed: ${xhr.status}`);
    }
  });
  
  // Handle request errors
  htmx.on('htmx:responseError', (event) => {
    const { xhr } = event.detail;
    
    // Retrieve the span from the xhr object
    const requestSpan = xhr._otelSpan;
    if (requestSpan) {
      // Record the error
      requestSpan.setStatus({
        code: 2, // Error status code in OpenTelemetry
        message: `HTMX response error: ${xhr.status}`
      });
      
      // Add an event for the error
      requestSpan.addEvent('htmx-request-error', {
        'htmx.status': xhr.status,
        'htmx.error': xhr.statusText
      });
      
      // End the span
      requestSpan.end();
      console.log(`HTMX request error: ${xhr.status}`);
    }
  });
  
  // HTMX AJAX load started
  htmx.on('htmx:beforeOnLoad', (event) => {
    const { xhr } = event.detail;
    
    // Retrieve the span from the xhr object
    const requestSpan = xhr._otelSpan;
    if (requestSpan) {
      // Add an event for content processing start
      requestSpan.addEvent('htmx-before-on-load');
    }
  });
  
  // HTMX AJAX load completed
  htmx.on('htmx:afterOnLoad', (event) => {
    const { xhr } = event.detail;
    
    // Retrieve the span from the xhr object
    const requestSpan = xhr._otelSpan;
    if (requestSpan) {
      // Add an event for content processing complete
      requestSpan.addEvent('htmx-after-on-load');
    }
  });
  
  console.log('HTMX OpenTelemetry tracing initialized');
}

// Initialize when the document is fully loaded
document.addEventListener('DOMContentLoaded', initializeHtmxTracing);

// Export key components for potential external use
export {
  webTracerWithZone,
  providerWithZone
};
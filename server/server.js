// server/server.js
const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const stripeLib = require('stripe');
const Airtable = require('airtable');
const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'stripe-checkout'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const stripePaymentTotal = new client.Counter({
  name: 'stripe_payments_total',
  help: 'Total number of Stripe payments',
  labelNames: ['status']
});

const airtableOperations = new client.Counter({
  name: 'airtable_operations_total',
  help: 'Total number of Airtable operations',
  labelNames: ['operation', 'status']
});

const webhookEvents = new client.Counter({
  name: 'stripe_webhook_events_total',
  help: 'Total number of Stripe webhook events',
  labelNames: ['event_type', 'status']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(stripePaymentTotal);
register.registerMetric(airtableOperations);
register.registerMetric(webhookEvents);

// Load .env variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Airtable setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Middleware to collect metrics (add this after app setup but before routes)
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.path, status: res.statusCode },
      duration
    );
    httpRequestTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
  });
  
  next();
});

// ✅ Webhook route (raw body before any middleware)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    webhookEvents.inc({ event_type: event.type, status: 'received' });
  } catch (err) {
    console.error('❌ Webhook signature error:', err.message);
    webhookEvents.inc({ event_type: 'unknown', status: 'signature_error' });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    stripePaymentTotal.inc({ status: 'completed' });
    const session = event.data.object;
    console.log('✅ Webhook session:', session);

    // Save to Airtable
    airtableOperations.inc({ operation: 'create', status: 'initiated' });
    base(process.env.AIRTABLE_TABLE_ID).create([
      {
        fields: {
          Name: session.customer_details?.name || 'Anonymous',
          Email: session.customer_email || session.customer_details?.email || 'N/A',
          Amount: session.amount_total / 100,
          Status: session.payment_status,
          SessionID: session.id,
        },
      },
    ], (err, records) => {
      if (err) {
        console.error('❌ Airtable error:', err);
        airtableOperations.inc({ operation: 'create', status: 'failed' });
      } else {
        console.log('✅ Order saved to Airtable');
        airtableOperations.inc({ operation: 'create', status: 'success' });
      }
    });
  } else {
    webhookEvents.inc({ event_type: event.type, status: 'processed' });
  }

  res.status(200).send({ received: true });
});

// ✅ Apply middleware AFTER webhook
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  const metrics = await register.metrics();
  res.end(metrics);
});

// Root health check
app.get('/', (req, res) => {
  res.send('✅ Server is up and running');
});

// Health check endpoint for Kubernetes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Create Stripe Checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Stripe Smart Checkout Product',
            },
            unit_amount: 2000,
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/success.html',
      cancel_url: 'http://localhost:3000/cancel.html',
    });

    stripePaymentTotal.inc({ status: 'initiated' });
    console.log('✅ Checkout session created:', session.id);
    res.json({ id: session.id });
  } catch (err) {
    stripePaymentTotal.inc({ status: 'failed' });
    console.error('❌ Failed to create checkout session:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Serve publishable key to frontend
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Additional endpoint to get application info
app.get('/info', (req, res) => {
  res.json({
    application: 'Stripe Smart Checkout',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    metrics_endpoint: '/metrics',
    health_endpoint: '/health'
  });
});

// Logging
console.log('✅ Server setup complete. Listening for requests...');

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`ℹ️  App info at http://localhost:${PORT}/info`);
});
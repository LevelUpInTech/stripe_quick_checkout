// server/server.js
const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const stripeLib = require('stripe');
const Airtable = require('airtable');

// Load .env variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const stripe = stripeLib(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Airtable setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// ✅ Webhook route (raw body before any middleware)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('✅ Webhook session:', session);

    // Save to Airtable
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
      } else {
        console.log('✅ Order saved to Airtable');
      }
    });
  }

  res.status(200).send({ received: true });
});

// ✅ Apply middleware AFTER webhook
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Root health check
app.get('/', (req, res) => {
  res.send('✅ Server is up and running');
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

    res.json({ id: session.id });
  } catch (err) {
    console.error('❌ Failed to create checkout session:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Serve publishable key to frontend
app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Logging
console.log('✅ Server setup complete. Listening for requests...');

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
// Add this right after the requires and before dotenv.config()
console.log('🔍 Starting server setup...');
console.log('🔍 Current directory:', __dirname);
console.log('🔍 Looking for .env at:', path.resolve(__dirname, '.env'));

// After dotenv.config()
console.log('🔍 Environment loaded');
console.log('🔍 STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('🔍 AIRTABLE_API_KEY exists:', !!process.env.AIRTABLE_API_KEY);

// After stripe initialization
console.log('🔍 Stripe initialized');

// After airtable initialization
console.log('🔍 Airtable initialized');
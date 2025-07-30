# 🧾 Stripe Smart Checkout

A lightweight, full-stack Node.js application that integrates Stripe Checkout with Airtable for seamless digital product purchases and automatic customer logging.

---

##  Features

- Stripe Smart Checkout session creation
- Webhook listener for payment confirmation
- Airtable integration to log successful purchases
- Environment variables for secure config
- Ready for deployment to platforms like Render

---

##  Tech Stack

- Node.js
- Express.js
- Stripe API
- Airtable API
- Dotenv

---

##  How It Works

1. A customer clicks a **Buy Now** button.
2. The backend creates a Stripe Checkout session.
3. After successful payment:
   - Stripe sends a webhook event
   - The webhook triggers a call to Airtable and logs the purchase details

---

##  Setup

### 1. Clone the Repository

```bash
git clone https://github.com/LevelUpInTech/stripe_quick_checkout.git
cd stripe_quick_checkout
```

2. Install Dependencies
```bash
npm install
```
3. Set Up Environment Variables
```Create a .env file in the /server directory:

.env

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
AIRTABLE_TABLE_NAME=Purchases
```
✅ Never commit .env files. This repo uses .gitignore to block secrets.

▶️ Run Locally
```bash
npm start
```
Your server will start on http://localhost:3000.

☁️ Deployment
This app is deployable on platforms like:

👉🏾 Render

👉🏾 Heroku

Vercel (for frontend only)

To deploy on Render, set your environment variables in the Render dashboard and point to server/server.js as your start script.

🧪 Test the Checkout Flow
Go to the frontend or trigger the POST /create-checkout-session endpoint

Complete the Stripe test checkout

Confirm a new entry appears in Airtable

🧰 Troubleshooting
Webhook not firing? 
👉🏾 Make sure your Render or local server is reachable and webhook secret is correct.

Airtable error? 
👉🏾 Check if the "Purchases" table and select fields match your script.

Push blocked by GitHub? 
👉🏾 Rotate your keys and clean secrets from history.

📄 License
MIT... do what you want, just don’t commit secrets 🙃

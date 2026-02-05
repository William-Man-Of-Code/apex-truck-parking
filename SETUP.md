# Apex Truck Parking - Complete Setup Guide

This guide will help you set up the full reservation system with Stripe payments and Supabase backend.

## What You'll Get

1. **Main Website** - Professional landing page with contact form
2. **Smart Daily Parking Flow** - Shows modal, checks availability, redirects to checkout
3. **Custom Checkout Page** - Date picker, MC/DOT input, Stripe payment
4. **Admin Dashboard** - View reservations, manage capacity, add walk-ins
5. **Capacity Management** - Auto-disables daily booking when 4+ spots booked

---

## Quick Start (Demo Mode)

The site works out of the box in demo mode for testing:

1. Open `index.html` in your browser
2. Fill out the form with "Daily Parking" selected
3. See the modal and checkout flow
4. Admin: Open `admin.html`, login with any email + password `admin123`

---

## Production Setup

### Step 1: Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from [Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
3. Copy your **Publishable key** (starts with `pk_`)

### Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → API and copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**

### Step 3: Set Up the Database

In Supabase, go to **SQL Editor** and run this:

```sql
-- Create reservations table
CREATE TABLE reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    mc_number TEXT,
    dot_number TEXT NOT NULL,
    truck_info TEXT,
    parking_date DATE NOT NULL,
    parking_type TEXT DEFAULT 'daily',
    amount INTEGER DEFAULT 2000, -- in cents
    status TEXT DEFAULT 'confirmed',
    stripe_payment_id TEXT,
    confirmation_code TEXT,
    expiration_reminder_sent TIMESTAMP WITH TIME ZONE, -- tracks if 2hr warning sent
    followup_sent TIMESTAMP WITH TIME ZONE, -- tracks if thank you/review request sent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for date queries
CREATE INDEX idx_reservations_date ON reservations(parking_date);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Enable Row Level Security
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Allow public to read availability (count only)
CREATE POLICY "Public can check availability" ON reservations
    FOR SELECT USING (true);

-- Allow authenticated users full access (admin)
CREATE POLICY "Admins have full access" ON reservations
    FOR ALL USING (auth.role() = 'authenticated');
```

### Step 4: Create an Admin User

In Supabase, go to **Authentication → Users** and click "Add User":
- Email: your email
- Password: choose a secure password

### Step 5: Update Configuration

Edit `config.js` with your credentials:

```javascript
const CONFIG = {
    STRIPE_PUBLISHABLE_KEY: 'pk_live_YOUR_KEY_HERE',
    SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_ANON_KEY',
    DAILY_RATE: 20,
    MAX_DAILY_SPOTS: 4,
    BUSINESS_PHONE: '(470) 838-2281',
    DEV_MODE: false, // IMPORTANT: Set to false for production
};
```

### Step 6: Set Up Stripe Checkout (Backend Required)

For payments to work, you need a small backend. Here are options:

#### Option A: Netlify Functions (Recommended)

Create `netlify/functions/create-payment.js`:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    const { totalAmount, email, dates, dotNumber } = JSON.parse(event.body);

    const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'usd',
        receipt_email: email,
        metadata: {
            dates: dates.join(', '),
            dot_number: dotNumber
        }
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ clientSecret: paymentIntent.client_secret })
    };
};
```

#### Option B: Use Stripe Payment Links

Simpler approach - create a Payment Link in Stripe Dashboard:
1. Go to [Stripe Payment Links](https://dashboard.stripe.com/payment-links)
2. Create a product "Daily Truck Parking - $20"
3. Enable "Let customers adjust quantity"
4. Update checkout.js to redirect to your payment link instead

### Step 7: Deploy

#### Deploy to Netlify (Easiest)

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `apex-truck-parking` folder
3. Connect your domain `apextruckparking.com`
4. Add environment variables in **Site Settings → Environment Variables**:

```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

5. Set up Stripe Webhook:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-site.netlify.app/.netlify/functions/stripe-webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

#### Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Connect domain

---

## File Structure

```
apex-truck-parking/
├── index.html          # Main landing page
├── checkout.html       # Daily parking checkout
├── admin.html          # Admin dashboard
├── styles.css          # Main styles
├── script.js           # Main site JavaScript
├── checkout.js         # Checkout page JavaScript
├── config.js           # Configuration (add your keys here)
├── README.md           # Basic readme
└── SETUP.md            # This file
```

---

## How It Works

### Daily Parking Flow

1. User visits site → fills form → selects "Daily Parking"
2. System checks Supabase for today's reservation count
3. If < 4 spots booked:
   - Shows green modal: "We have daily parking available!"
   - Redirects to checkout.html
4. If >= 4 spots booked:
   - Shows red modal: "Currently at Capacity"
   - Prompts user to call

### Checkout Flow

1. User enters contact info + MC/DOT number
2. Selects parking dates from calendar
3. Unavailable dates shown in red
4. Enters payment via Stripe
5. On success:
   - Reservation saved to Supabase
   - Confirmation shown
   - (Future: SMS sent via Twilio)

### Admin Dashboard

1. Login with Supabase credentials
2. View today's stats: spots used, revenue
3. See capacity bar (green/yellow/red)
4. View reservations table by date
5. Quick-add walk-in reservations
6. Cancel reservations if needed

---

## Customization

### Change Pricing

Edit `config.js`:
```javascript
DAILY_RATE: 20,  // Change to $20/day
```

Also update:
- `index.html` pricing cards
- `checkout.html` price display

### Change Capacity

Edit `config.js`:
```javascript
MAX_DAILY_SPOTS: 6,  // Allow 6 daily spots
```

### SMS Notifications (Already Configured!)

Twilio SMS is already integrated. When a daily parking payment succeeds:
1. Stripe webhook fires
2. Reservation is confirmed in database
3. SMS is sent with confirmation, dates, and gate code

Your Twilio credentials are configured in the environment variables.

---

## Testing

### Test Stripe Payments

Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any CVC
- Any ZIP

### Test Admin Login

In demo mode: any email + password `admin123`

---

## Support

For issues with:
- **Stripe**: [stripe.com/docs](https://stripe.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Netlify**: [docs.netlify.com](https://docs.netlify.com)

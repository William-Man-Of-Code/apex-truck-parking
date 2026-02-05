# Apex Truck Parking - Deployment Checklist

Follow these steps in order to get your site live.

---

## Step 1: Set Up Supabase Database (5 minutes)

1. Go to your Supabase project: https://supabase.com/dashboard/project/yxnvpebwbwlcgbkgdtpp

2. Click **SQL Editor** in the left sidebar

3. Paste and run this SQL:

```sql
-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
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
    amount INTEGER DEFAULT 1500,
    status TEXT DEFAULT 'confirmed',
    stripe_payment_id TEXT,
    confirmation_code TEXT,
    expiration_reminder_sent TIMESTAMP WITH TIME ZONE,
    followup_sent TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(parking_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation ON reservations(confirmation_code);

-- Enable Row Level Security
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Allow public to read (for availability checking)
CREATE POLICY "Public read access" ON reservations FOR SELECT USING (true);

-- Allow public to insert (for new reservations)
CREATE POLICY "Public insert access" ON reservations FOR INSERT WITH CHECK (true);

-- Allow updates (for status changes)
CREATE POLICY "Public update access" ON reservations FOR UPDATE USING (true);
```

4. Click **Run** to execute

5. Get your **Service Role Key** (needed for backend):
   - Go to **Settings** → **API**
   - Copy the `service_role` key (starts with `eyJ...`)
   - ⚠️ Keep this secret! Only use in Netlify environment variables

---

## Step 2: Deploy to Netlify (5 minutes)

1. Go to https://app.netlify.com/drop

2. Drag and drop the entire `apex-truck-parking` folder

3. Wait for deployment to complete

4. Note your site URL (e.g., `random-name-123.netlify.app`)

---

## Step 3: Add Environment Variables in Netlify (5 minutes)

1. In Netlify, go to **Site Settings** → **Environment Variables**

2. Add these variables one by one:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (starts with `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | (get this in Step 4) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_KEY` | (the service_role key from Supabase) |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |

---

## Step 4: Set Up Stripe Webhook (5 minutes)

1. Go to https://dashboard.stripe.com/webhooks

2. Click **Add endpoint**

3. Enter your endpoint URL:
   ```
   https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook
   ```
   (Replace YOUR-SITE with your actual Netlify subdomain)

4. Under **Select events to listen to**, click **Select events** and choose:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. Click **Add endpoint**

6. On the webhook page, click **Reveal** under Signing secret

7. Copy the signing secret (starts with `whsec_`)

8. Go back to Netlify and add it as `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Redeploy Netlify (1 minute)

After adding all environment variables:

1. Go to **Deploys** in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete

---

## Step 6: Connect Your Domain (5 minutes)

1. In Netlify, go to **Domain settings**

2. Click **Add custom domain**

3. Enter: `apextruckparking.com`

4. Follow Netlify's instructions to update your DNS settings

If your domain is on Wix:
- Go to Wix domain settings
- Change nameservers to Netlify's, OR
- Add a CNAME record pointing to your Netlify site

---

## Step 7: Test Everything

### Test the checkout flow:
1. Go to your site
2. Fill out the form with "Daily Parking"
3. Complete checkout (use test card: `4242 4242 4242 4242`)
4. Verify you receive an SMS

### Test the admin dashboard:
1. Go to `yoursite.com/admin.html`
2. Login with your Supabase credentials
3. Verify you can see reservations

---

## Troubleshooting

### "SMS not sending"
- Check Twilio credentials are correct
- Verify phone number format includes country code
- Check Netlify function logs for errors

### "Payment failing"
- Verify Stripe keys are correct (live keys, not test)
- Check webhook is set up and receiving events
- Check Netlify function logs

### "Database errors"
- Verify Supabase URL and keys
- Check that the table was created
- Look at Supabase logs

### View Netlify function logs:
1. Go to Netlify → Functions
2. Click on a function
3. View recent invocations and errors

---

## Your Credentials Reference

**Stripe (Live)**
- Publishable: In config.js
- Secret: Netlify only

**Supabase**
- URL: In config.js
- Anon Key: In config.js
- Service Key: Netlify only

**Twilio**
- Account SID: Netlify only
- Auth Token: Netlify only
- Phone: Netlify only

---

## Done!

Once all steps are complete, your site will:
- ✅ Accept daily parking reservations with Stripe payments
- ✅ Send SMS confirmations with gate code
- ✅ Send 2-hour expiration reminders with extension link
- ✅ Send post-parking thank you + Google review request
- ✅ Track capacity and auto-disable when full
- ✅ Provide admin dashboard for managing reservations

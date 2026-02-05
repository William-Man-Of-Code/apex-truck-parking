# Truck Parking Club Email Integration

This guide shows how to automatically add bookings from Truck Parking Club emails into your system.

## How It Works

1. Truck Parking Club sends you a booking email
2. Email gets forwarded to Zapier
3. Zapier parses the email and extracts booking data
4. Zapier sends the data to your webhook
5. Webhook adds the booking to your database + sends SMS to customer

---

## Option A: Zapier (Recommended - Easiest)

### Step 1: Create a Zapier Account
Go to https://zapier.com and sign up (free tier works)

### Step 2: Create a New Zap

1. Click **Create Zap**

2. **Trigger: Email by Zapier**
   - Choose "New Inbound Email"
   - Zapier will give you a unique email address like: `robot@robot.zapier.com`
   - Copy this email address

3. **Set up email forwarding in Gmail:**
   - Go to Gmail Settings → Forwarding
   - Add the Zapier email as a forwarding address
   - Or create a filter: From "Truck Parking Club" → Forward to Zapier email

### Step 3: Parse the Email (in Zapier)

Add a **Formatter** step:
- Choose "Text" → "Extract Pattern"
- Set up patterns to extract:
  - Customer name
  - Phone number
  - Check-in date
  - Check-out date
  - Amount paid

**Example patterns:**
```
Name: (.+)
Phone: ([\d\-\(\)\s]+)
Check-in: (\d{1,2}\/\d{1,2}\/\d{4})
Check-out: (\d{1,2}\/\d{1,2}\/\d{4})
```

### Step 4: Send to Webhook

Add a **Webhooks by Zapier** action:
- Choose "POST"
- URL: `https://YOUR-SITE.netlify.app/api/email-booking`
- Payload Type: JSON
- Data:

```json
{
  "source": "truck_parking_club",
  "booking_type": "new",
  "customer_name": "{{parsed_name}}",
  "phone": "{{parsed_phone}}",
  "email": "{{parsed_email}}",
  "check_in": "{{parsed_checkin}}",
  "check_out": "{{parsed_checkout}}",
  "amount_paid": "{{parsed_amount}}",
  "confirmation_number": "{{parsed_confirmation}}"
}
```

### Step 5: Test & Enable
- Send a test email from Truck Parking Club
- Verify the booking appears in your admin dashboard
- Turn on the Zap

---

## Option B: Manual Email Forwarding (No-Code Alternative)

If Zapier is too complex, you can set up a simpler flow:

### Use Mailparser.io

1. Sign up at https://mailparser.io (free tier: 30 emails/month)

2. Create a parsing template for Truck Parking Club emails

3. Set the webhook destination to:
   ```
   https://YOUR-SITE.netlify.app/api/email-booking
   ```

4. Forward your Truck Parking Club emails to your Mailparser address

---

## Option C: Direct Email Forwarding Rule

Set up a Gmail filter to auto-forward, then have Zapier watch for specific patterns.

### Gmail Filter Setup:
1. Search: `from:(truckparkingclub) subject:(booking OR reservation)`
2. Create filter → Forward to: `your-zapier-email@robot.zapier.com`

---

## Webhook Data Format

Your webhook at `/api/email-booking` expects this JSON format:

```json
{
  "source": "truck_parking_club",
  "booking_type": "new",
  "customer_name": "John Smith",
  "phone": "555-123-4567",
  "email": "john@example.com",
  "check_in": "2024-02-10",
  "check_out": "2024-02-12",
  "nights": 2,
  "vehicle_type": "Semi with trailer",
  "dot_number": "1234567",
  "mc_number": "MC-123456",
  "amount_paid": 30.00,
  "confirmation_number": "TPC-12345"
}
```

**Required fields:**
- `customer_name`
- `phone`
- `check_in` (YYYY-MM-DD format)

**Optional fields:**
- Everything else (will use defaults if not provided)

---

## Testing the Webhook

You can test the webhook directly with curl:

```bash
curl -X POST https://YOUR-SITE.netlify.app/api/email-booking \
  -H "Content-Type: application/json" \
  -d '{
    "source": "truck_parking_club",
    "customer_name": "Test Driver",
    "phone": "4705551234",
    "check_in": "2024-02-15",
    "check_out": "2024-02-17",
    "amount_paid": 30
  }'
```

---

## Security (Optional)

To secure the webhook, add a secret token:

1. In Netlify, add environment variable:
   ```
   EMAIL_WEBHOOK_SECRET=your-secret-key-here
   ```

2. In Zapier, add header:
   ```
   Authorization: Bearer your-secret-key-here
   ```

---

## What Happens When a Booking Comes In

1. ✅ Booking added to database
2. ✅ Customer receives SMS with gate code
3. ✅ Shows up in admin dashboard
4. ✅ Counts toward daily capacity
5. ✅ Gets expiration reminder (2hrs before checkout)
6. ✅ Gets thank you + review request (day after)

---

## Troubleshooting

### Bookings not appearing
- Check Netlify function logs for errors
- Verify the date format is YYYY-MM-DD
- Check phone number is being parsed correctly

### Duplicate bookings
- The system checks for duplicate confirmation numbers
- If same confirmation_number is sent twice, it's ignored

### SMS not sending
- Verify phone number format
- Check Twilio credentials in Netlify
- Look at Netlify function logs

---

## Sample Truck Parking Club Email

If your emails look like this:
```
New Booking at Apex Truck Parking

Customer: John Smith
Phone: (555) 123-4567
Email: john@trucking.com

Check-in: 02/10/2024
Check-out: 02/12/2024
Nights: 2

Vehicle: Semi with 53' trailer
DOT#: 1234567

Total Paid: $30.00
Confirmation: TPC-ABC123
```

Then your Zapier parser would extract each field and map it to the webhook JSON.

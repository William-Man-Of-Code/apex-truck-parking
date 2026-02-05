/**
 * Apex Truck Parking - Stripe Webhook Handler
 * Handles payment confirmation and sends SMS
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

exports.handler = async (event, context) => {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            event.body,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle successful payment
    if (stripeEvent.type === 'payment_intent.succeeded') {
        const paymentIntent = stripeEvent.data.object;

        console.log('Payment succeeded:', paymentIntent.id);

        try {
            // Update reservation status in Supabase
            const { data: reservations, error: fetchError } = await supabase
                .from('reservations')
                .select('*')
                .eq('stripe_payment_id', paymentIntent.id);

            if (fetchError) {
                console.error('Error fetching reservations:', fetchError);
            }

            if (reservations && reservations.length > 0) {
                // Update status to confirmed
                const { error: updateError } = await supabase
                    .from('reservations')
                    .update({ status: 'confirmed' })
                    .eq('stripe_payment_id', paymentIntent.id);

                if (updateError) {
                    console.error('Error updating reservation:', updateError);
                }

                // Get reservation details for SMS
                const reservation = reservations[0];
                const dates = reservations.map(r => r.parking_date);
                const totalAmount = paymentIntent.amount / 100; // Convert cents to dollars

                // Format phone number
                let phone = reservation.phone.replace(/\D/g, '');
                if (phone.length === 10) {
                    phone = '+1' + phone;
                }

                // Format dates for SMS
                const dateList = dates.map(d => {
                    const date = new Date(d + 'T12:00:00');
                    return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                }).join(', ');

                // Send SMS confirmation
                const smsMessage = `Apex Truck Parking - Confirmed!

Hi ${reservation.first_name}, your daily parking is reserved.

📍 6759 Marbut Rd, Lithonia, GA 30058

📅 ${dateList}
💰 $${totalAmount} paid

🔐 Gate Code: 1234

Conf#: ${reservation.confirmation_code}

Questions? (470) 838-2281`;

                try {
                    await twilioClient.messages.create({
                        body: smsMessage,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: phone
                    });
                    console.log('SMS sent to:', phone);
                } catch (smsError) {
                    console.error('SMS Error:', smsError);
                    // Don't fail webhook for SMS errors
                }
            }

        } catch (error) {
            console.error('Error processing payment confirmation:', error);
        }
    }

    // Handle payment failure
    if (stripeEvent.type === 'payment_intent.payment_failed') {
        const paymentIntent = stripeEvent.data.object;
        console.log('Payment failed:', paymentIntent.id);

        // Update reservation status
        await supabase
            .from('reservations')
            .update({ status: 'failed' })
            .eq('stripe_payment_id', paymentIntent.id);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
    };
};

/**
 * Apex Truck Parking - Scheduled Reminder Function
 * Runs on a schedule to send:
 * 1. Expiration reminders (2 hours before checkout)
 * 2. Post-parking thank you + review requests
 *
 * Schedule this to run every 30 minutes via Netlify Scheduled Functions
 */

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

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const SITE_URL = process.env.URL || 'https://apextruckparking.com';
const GOOGLE_REVIEW_URL = 'https://g.page/r/CdoDNoSfz0r6EAI/review';

// Configure checkout time (when daily parking expires)
const CHECKOUT_HOUR = 12; // Noon checkout

exports.handler = async (event, context) => {
    console.log('Running scheduled reminders...');

    try {
        const results = {
            expirationReminders: await sendExpirationReminders(),
            thankYouMessages: await sendThankYouMessages()
        };

        return {
            statusCode: 200,
            body: JSON.stringify(results)
        };
    } catch (error) {
        console.error('Scheduler error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * Send reminders to parkers whose stay expires in ~2 hours
 */
async function sendExpirationReminders() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    // Check if we're within the reminder window (2 hours before checkout)
    // If checkout is at noon (12), send reminders around 10 AM
    const reminderHour = CHECKOUT_HOUR - 2;

    // Only run during the reminder window (with some buffer)
    if (currentHour < reminderHour - 1 || currentHour > reminderHour + 1) {
        return { skipped: true, reason: 'Outside reminder window' };
    }

    // Find reservations ending today that haven't received a reminder
    // Skip Truck Parking Club bookings (they handle their own communications)
    const { data: expiringReservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('parking_date', today)
        .eq('status', 'confirmed')
        .is('expiration_reminder_sent', null)
        .not('stripe_payment_id', 'like', 'TPC_%');

    if (error) {
        console.error('Error fetching expiring reservations:', error);
        return { error: error.message };
    }

    if (!expiringReservations || expiringReservations.length === 0) {
        return { sent: 0, message: 'No expiring reservations to remind' };
    }

    let sentCount = 0;

    for (const reservation of expiringReservations) {
        try {
            // Format phone
            let phone = reservation.phone.replace(/\D/g, '');
            if (phone.length === 10) phone = '+1' + phone;

            // Create extension link with pre-filled info
            const extendUrl = `${SITE_URL}/extend.html?confirmation=${reservation.confirmation_code}&phone=${encodeURIComponent(reservation.phone)}`;

            const message = `Hi ${reservation.first_name}! Your parking at Apex Truck Parking expires today at noon.

Need more time? Extend your stay here:
${extendUrl}

Or call us: (470) 838-2281

Thanks for parking with us!`;

            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE,
                to: phone
            });

            // Mark reminder as sent
            await supabase
                .from('reservations')
                .update({ expiration_reminder_sent: new Date().toISOString() })
                .eq('id', reservation.id);

            sentCount++;
            console.log(`Expiration reminder sent to ${phone}`);

        } catch (smsError) {
            console.error(`Failed to send reminder to ${reservation.phone}:`, smsError);
        }
    }

    return { sent: sentCount };
}

/**
 * Send thank you + review request to parkers whose stay ended yesterday
 */
async function sendThankYouMessages() {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Find reservations that ended yesterday and haven't received follow-up
    // Skip Truck Parking Club bookings (they handle their own communications)
    const { data: completedReservations, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('parking_date', yesterdayStr)
        .eq('status', 'confirmed')
        .is('followup_sent', null)
        .not('stripe_payment_id', 'like', 'TPC_%');

    if (error) {
        console.error('Error fetching completed reservations:', error);
        return { error: error.message };
    }

    if (!completedReservations || completedReservations.length === 0) {
        return { sent: 0, message: 'No completed reservations to follow up' };
    }

    let sentCount = 0;

    for (const reservation of completedReservations) {
        try {
            // Format phone
            let phone = reservation.phone.replace(/\D/g, '');
            if (phone.length === 10) phone = '+1' + phone;

            const message = `Hi ${reservation.first_name}! Thanks for parking at Apex Truck Parking. We hope you had a great stay!

If you had a good experience, we'd really appreciate a quick Google review - it helps other truckers find us:

${GOOGLE_REVIEW_URL}

Safe travels and see you next time!
- Apex Truck Parking Team`;

            await twilioClient.messages.create({
                body: message,
                from: TWILIO_PHONE,
                to: phone
            });

            // Mark follow-up as sent
            await supabase
                .from('reservations')
                .update({ followup_sent: new Date().toISOString() })
                .eq('id', reservation.id);

            sentCount++;
            console.log(`Thank you message sent to ${phone}`);

        } catch (smsError) {
            console.error(`Failed to send thank you to ${reservation.phone}:`, smsError);
        }
    }

    return { sent: sentCount };
}

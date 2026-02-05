/**
 * Apex Truck Parking - Extend Stay Function
 * Handles payment for extending a parking reservation
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

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        const { confirmationCode, phone, additionalDays, amount } = JSON.parse(event.body);

        if (!confirmationCode || !additionalDays || !amount) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Find original reservation
        const { data: originalReservation, error: fetchError } = await supabase
            .from('reservations')
            .select('*')
            .eq('confirmation_code', confirmationCode)
            .eq('status', 'confirmed')
            .order('parking_date', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !originalReservation) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Reservation not found' })
            };
        }

        // Calculate new dates
        const lastDate = new Date(originalReservation.parking_date + 'T12:00:00');
        const newDates = [];
        for (let i = 1; i <= additionalDays; i++) {
            const newDate = new Date(lastDate);
            newDate.setDate(newDate.getDate() + i);
            newDates.push(newDate.toISOString().split('T')[0]);
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            metadata: {
                type: 'extension',
                original_confirmation: confirmationCode,
                new_dates: newDates.join(', ')
            }
        });

        // Create new reservation entries for extended dates
        const newReservations = newDates.map(date => ({
            first_name: originalReservation.first_name,
            last_name: originalReservation.last_name,
            email: originalReservation.email,
            phone: originalReservation.phone,
            mc_number: originalReservation.mc_number,
            dot_number: originalReservation.dot_number,
            truck_info: originalReservation.truck_info,
            parking_date: date,
            parking_type: 'daily',
            amount: Math.round(amount / additionalDays),
            status: 'confirmed', // Auto-confirm extensions
            stripe_payment_id: paymentIntent.id,
            confirmation_code: confirmationCode // Use same confirmation code
        }));

        await supabase.from('reservations').insert(newReservations);

        // Format phone and send SMS
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '+1' + formattedPhone;
        }

        const dateList = newDates.map(d => {
            const date = new Date(d + 'T12:00:00');
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }).join(', ');

        const lastNewDate = new Date(newDates[newDates.length - 1] + 'T12:00:00');
        const checkoutStr = lastNewDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });

        const smsMessage = `Apex Truck Parking - Extended!

Hi ${originalReservation.first_name}, your stay has been extended.

📅 Added: ${dateList}
💰 $${amount / 100} paid

New checkout: ${checkoutStr} at noon

Conf#: ${confirmationCode}

Thanks for staying with us!`;

        try {
            await twilioClient.messages.create({
                body: smsMessage,
                from: TWILIO_PHONE,
                to: formattedPhone
            });
        } catch (smsError) {
            console.error('SMS error:', smsError);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                clientSecret: paymentIntent.client_secret,
                newDates,
                newCheckout: checkoutStr
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

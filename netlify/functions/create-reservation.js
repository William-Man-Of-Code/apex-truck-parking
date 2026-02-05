/**
 * Apex Truck Parking - Create Reservation Function
 * Handles: Stripe Payment → Save to Supabase → Send SMS
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Initialize Twilio
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const {
            firstName,
            lastName,
            email,
            phone,
            mcNumber,
            dotNumber,
            truckInfo,
            dates,
            totalAmount // in cents
        } = data;

        // Validate required fields
        if (!firstName || !phone || !dotNumber || !dates || dates.length === 0) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Generate confirmation code
        const confirmationCode = 'APX-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Step 1: Create Stripe Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'usd',
            receipt_email: email || undefined,
            metadata: {
                confirmation_code: confirmationCode,
                dates: dates.join(', '),
                dot_number: dotNumber,
                customer_name: `${firstName} ${lastName}`
            }
        });

        // Step 2: Save reservation to Supabase (for each date)
        const reservations = dates.map(date => ({
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            phone: phone,
            mc_number: mcNumber || null,
            dot_number: dotNumber,
            truck_info: truckInfo || null,
            parking_date: date,
            parking_type: 'daily',
            amount: totalAmount / dates.length, // per day amount in cents
            status: 'pending', // Will be updated to 'confirmed' after payment
            stripe_payment_id: paymentIntent.id,
            confirmation_code: confirmationCode
        }));

        const { error: dbError } = await supabase
            .from('reservations')
            .insert(reservations);

        if (dbError) {
            console.error('Database error:', dbError);
            // Don't fail the whole request - payment can still proceed
        }

        // Return client secret for Stripe.js to complete payment
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                confirmationCode: confirmationCode
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message })
        };
    }
};

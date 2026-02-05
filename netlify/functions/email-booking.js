/**
 * Apex Truck Parking - Email Booking Webhook
 * Receives parsed booking data from email forwarding service (Zapier, Mailparser, etc.)
 * Adds bookings from Truck Parking Club to the system
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
const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || ''; // Optional security

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    try {
        // Optional: Verify webhook secret
        if (WEBHOOK_SECRET) {
            const authHeader = event.headers['authorization'] || event.headers['Authorization'];
            if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
                return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
            }
        }

        const data = JSON.parse(event.body);
        console.log('Received email booking data:', JSON.stringify(data, null, 2));

        /*
         * Expected data format (customize based on your email parser output):
         * {
         *   source: "truck_parking_club",
         *   booking_type: "new" | "extension",
         *   customer_name: "John Smith",
         *   phone: "555-123-4567",
         *   email: "john@example.com",
         *   check_in: "2024-02-10",
         *   check_out: "2024-02-12",
         *   nights: 2,
         *   vehicle_type: "Semi with trailer",
         *   dot_number: "1234567",
         *   mc_number: "MC-123456",
         *   amount_paid: 30.00,
         *   confirmation_number: "TPC-12345"
         * }
         */

        // Validate required fields
        const requiredFields = ['customer_name', 'phone', 'check_in'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: `Missing required field: ${field}` })
                };
            }
        }

        // Parse name into first/last
        const nameParts = data.customer_name.trim().split(' ');
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Calculate dates
        const checkIn = new Date(data.check_in + 'T12:00:00');
        const checkOut = data.check_out
            ? new Date(data.check_out + 'T12:00:00')
            : new Date(checkIn.getTime() + (data.nights || 1) * 24 * 60 * 60 * 1000);

        // Generate dates array
        const parkingDates = [];
        const currentDate = new Date(checkIn);
        while (currentDate < checkOut) {
            parkingDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Generate confirmation code if not provided
        const confirmationCode = data.confirmation_number ||
            'TPC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        // Check if this booking already exists (prevent duplicates)
        const { data: existing } = await supabase
            .from('reservations')
            .select('id')
            .eq('confirmation_code', confirmationCode)
            .limit(1);

        if (existing && existing.length > 0) {
            console.log('Booking already exists:', confirmationCode);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Booking already exists',
                    confirmation_code: confirmationCode
                })
            };
        }

        // Create reservation entries for each date
        const reservations = parkingDates.map(date => ({
            first_name: firstName,
            last_name: lastName,
            email: data.email || null,
            phone: data.phone,
            mc_number: data.mc_number || null,
            dot_number: data.dot_number || 'TPC-BOOKING',
            truck_info: data.vehicle_type || 'Truck Parking Club Booking',
            parking_date: date,
            parking_type: 'daily',
            amount: Math.round((data.amount_paid || 20) * 100 / parkingDates.length), // cents per day
            status: 'confirmed',
            confirmation_code: confirmationCode,
            created_at: new Date().toISOString()
        }));

        // Insert into database
        const { error: insertError } = await supabase
            .from('reservations')
            .insert(reservations);

        if (insertError) {
            console.error('Database insert error:', insertError);
            throw new Error('Failed to save booking: ' + insertError.message);
        }

        console.log(`Added ${parkingDates.length} reservation(s) for ${firstName} ${lastName}`);

        // Send SMS confirmation to customer
        if (data.phone) {
            try {
                let phone = data.phone.replace(/\D/g, '');
                if (phone.length === 10) phone = '+1' + phone;
                else if (!phone.startsWith('+')) phone = '+' + phone;

                const dateList = parkingDates.map(d => {
                    const date = new Date(d + 'T12:00:00');
                    return date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                }).join(', ');

                const smsMessage = `Apex Truck Parking - Confirmed!

Hi ${firstName}, your booking via Truck Parking Club is confirmed.

📍 6759 Marbut Rd, Lithonia, GA 30058

📅 ${dateList}

🔐 Gate Code: 1234

Conf#: ${confirmationCode}

Questions? (470) 838-2281`;

                await twilioClient.messages.create({
                    body: smsMessage,
                    from: TWILIO_PHONE,
                    to: phone
                });

                console.log('SMS sent to:', phone);
            } catch (smsError) {
                console.error('SMS error:', smsError);
                // Don't fail the whole request for SMS errors
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Booking added successfully',
                confirmation_code: confirmationCode,
                dates: parkingDates,
                customer: `${firstName} ${lastName}`
            })
        };

    } catch (error) {
        console.error('Email booking error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

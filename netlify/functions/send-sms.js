/**
 * Apex Truck Parking - SMS Notification Function
 * Sends confirmation SMS via Twilio for daily parking reservations
 */

const twilio = require('twilio');

exports.handler = async (event, context) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Get credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
        console.error('Missing Twilio credentials');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'SMS service not configured' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        const { phone, firstName, dates, confirmationCode, totalAmount } = data;

        if (!phone) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Phone number required' })
            };
        }

        // Format phone number for Twilio (ensure +1 prefix)
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.length === 10) {
            formattedPhone = '+1' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        // Format dates for SMS
        const dateList = dates.map(d => {
            const date = new Date(d + 'T12:00:00');
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }).join(', ');

        // Create SMS message
        const message = `Apex Truck Parking - Confirmed!

Hi ${firstName}, your daily parking is reserved.

📍 Location: 6759 Marbut Rd, Lithonia, GA 30058

📅 Dates: ${dateList}
💰 Total: $${totalAmount}

🔐 Gate Code: 1234

Confirmation: ${confirmationCode}

Questions? Call (470) 838-2281

Thank you for choosing Apex!`;

        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Send SMS
        const result = await client.messages.create({
            body: message,
            from: twilioPhone,
            to: formattedPhone
        });

        console.log('SMS sent successfully:', result.sid);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                messageSid: result.sid
            })
        };

    } catch (error) {
        console.error('SMS Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to send SMS',
                details: error.message
            })
        };
    }
};

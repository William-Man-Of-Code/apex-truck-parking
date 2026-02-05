/**
 * Apex Truck Parking - Check Daily Availability
 * Returns the number of spots available for a given date
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const MAX_DAILY_SPOTS = 4;

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

    try {
        // Get date from query params or use today
        const params = event.queryStringParameters || {};
        const date = params.date || new Date().toISOString().split('T')[0];

        // Count confirmed reservations for this date
        const { data, error, count } = await supabase
            .from('reservations')
            .select('id', { count: 'exact' })
            .eq('parking_date', date)
            .eq('status', 'confirmed');

        if (error) {
            throw error;
        }

        const spotsBooked = count || 0;
        const spotsAvailable = Math.max(0, MAX_DAILY_SPOTS - spotsBooked);
        const isAvailable = spotsAvailable > 0;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                date,
                spotsBooked,
                spotsAvailable,
                maxSpots: MAX_DAILY_SPOTS,
                isAvailable
            })
        };

    } catch (error) {
        console.error('Error checking availability:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * Apex Truck Parking - Incoming SMS Webhook
 * Receives SMS from Twilio and parses Truck Parking Club bookings
 *
 * Truck Parking Club sends from: +12058523087
 */

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const TRUCK_PARKING_CLUB_NUMBER = '+12058523087';

exports.handler = async (event, context) => {
    // Twilio expects TwiML response
    const twimlResponse = (message = '') => ({
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: `<?xml version="1.0" encoding="UTF-8"?><Response>${message ? `<Message>${message}</Message>` : ''}</Response>`
    });

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Parse the incoming SMS data from Twilio
        const params = new URLSearchParams(event.body);
        const from = params.get('From');
        const body = params.get('Body');
        const to = params.get('To');

        console.log('Incoming SMS from:', from);
        console.log('Message body:', body);

        // Check if this is from Truck Parking Club
        const normalizedFrom = from.replace(/\D/g, '');
        const tpcNumber = TRUCK_PARKING_CLUB_NUMBER.replace(/\D/g, '');

        if (!normalizedFrom.includes(tpcNumber) && !normalizedFrom.endsWith(tpcNumber.slice(-10))) {
            console.log('SMS not from Truck Parking Club, ignoring');
            // Could forward to your personal phone or handle differently
            return twimlResponse();
        }

        // Parse the Truck Parking Club booking message
        const booking = parseTruckParkingClubMessage(body);

        if (!booking) {
            console.error('Could not parse booking from message');
            return twimlResponse();
        }

        console.log('Parsed booking:', booking);

        // Check for duplicate booking
        const { data: existing } = await supabase
            .from('reservations')
            .select('id')
            .eq('confirmation_code', booking.confirmationCode)
            .limit(1);

        if (existing && existing.length > 0) {
            console.log('Booking already exists:', booking.confirmationCode);
            return twimlResponse();
        }

        // Calculate parking dates
        const parkingDates = [];
        const currentDate = new Date(booking.checkIn);
        const checkOutDate = new Date(booking.checkOut);

        while (currentDate < checkOutDate) {
            parkingDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // If same day (less than 24 hours), still count as 1 day
        if (parkingDates.length === 0) {
            parkingDates.push(booking.checkIn.split('T')[0]);
        }

        // Create reservation entries
        const reservations = parkingDates.map(date => ({
            first_name: 'TPC',
            last_name: booking.memberNumber,
            email: null,
            phone: booking.memberNumber, // Store member # as phone for now
            mc_number: null,
            dot_number: booking.memberNumber,
            truck_info: `${booking.trailerType || 'Trailer'} #${booking.trailerNumber || 'N/A'} - ${booking.companyName || 'TPC Booking'}`.trim(),
            parking_date: date,
            parking_type: 'daily',
            amount: 2000, // $20 per day in cents
            status: 'confirmed',
            confirmation_code: booking.confirmationCode,
            stripe_payment_id: 'TPC_' + booking.confirmationCode, // Mark as TPC payment
            created_at: new Date().toISOString()
        }));

        // Insert into database
        const { error: insertError } = await supabase
            .from('reservations')
            .insert(reservations);

        if (insertError) {
            console.error('Database insert error:', insertError);
            return twimlResponse();
        }

        console.log(`Added ${parkingDates.length} day(s) for TPC booking ${booking.confirmationCode}`);

        // No response SMS needed - this is just an automated import
        return twimlResponse();

    } catch (error) {
        console.error('Incoming SMS error:', error);
        return twimlResponse();
    }
};

/**
 * Parse Truck Parking Club SMS message
 *
 * Example message:
 * Your parking spot "Lithonia, GA Truck & Trailer Parking on Marbut Rd, 6759 Marbut Rd, Lithonia, GA 30058"
 * has been rented for 1 vehicle(s) from February 5 2026, 12:15 PM to February 6 2026, 12:15 PM
 * Booking #: EXT_KHE1I
 * Trucker Member #: ZSP386
 * Company Name on Trailer:
 * Trailer Type: Dry van
 * Trailer #: 096102
 * Trailer Plate:
 */
function parseTruckParkingClubMessage(message) {
    try {
        // Extract date range
        // Pattern: "from Month DD YYYY, HH:MM AM/PM to Month DD YYYY, HH:MM AM/PM"
        const datePattern = /from\s+(\w+\s+\d{1,2}\s+\d{4},?\s+\d{1,2}:\d{2}\s*[AP]M)\s+to\s+(\w+\s+\d{1,2}\s+\d{4},?\s+\d{1,2}:\d{2}\s*[AP]M)/i;
        const dateMatch = message.match(datePattern);

        if (!dateMatch) {
            console.error('Could not parse dates from message');
            return null;
        }

        const checkIn = parseFlexibleDate(dateMatch[1]);
        const checkOut = parseFlexibleDate(dateMatch[2]);

        // Extract Booking #
        const bookingMatch = message.match(/Booking\s*#:\s*(\S+)/i);
        const confirmationCode = bookingMatch ? bookingMatch[1].trim() : 'TPC-' + Date.now();

        // Extract Member #
        const memberMatch = message.match(/Trucker\s*Member\s*#:\s*(\S+)/i);
        const memberNumber = memberMatch ? memberMatch[1].trim() : 'UNKNOWN';

        // Extract Company Name
        const companyMatch = message.match(/Company\s*Name\s*on\s*Trailer:\s*(.+?)(?=\n|Trailer Type)/i);
        const companyName = companyMatch ? companyMatch[1].trim() : '';

        // Extract Trailer Type
        const trailerTypeMatch = message.match(/Trailer\s*Type:\s*(.+?)(?=\n|Trailer #)/i);
        const trailerType = trailerTypeMatch ? trailerTypeMatch[1].trim() : '';

        // Extract Trailer #
        const trailerNumMatch = message.match(/Trailer\s*#:\s*(\S+)/i);
        const trailerNumber = trailerNumMatch ? trailerNumMatch[1].trim() : '';

        // Extract Trailer Plate
        const plateMatch = message.match(/Trailer\s*Plate:\s*(\S*)/i);
        const trailerPlate = plateMatch ? plateMatch[1].trim() : '';

        // Extract vehicle count
        const vehicleMatch = message.match(/(\d+)\s*vehicle\(s\)/i);
        const vehicleCount = vehicleMatch ? parseInt(vehicleMatch[1]) : 1;

        return {
            checkIn,
            checkOut,
            confirmationCode,
            memberNumber,
            companyName,
            trailerType,
            trailerNumber,
            trailerPlate,
            vehicleCount
        };

    } catch (error) {
        console.error('Error parsing TPC message:', error);
        return null;
    }
}

/**
 * Parse flexible date format like "February 5 2026, 12:15 PM"
 */
function parseFlexibleDate(dateStr) {
    try {
        // Clean up the string
        const cleaned = dateStr.trim().replace(/,/g, '');

        // Parse with Date
        const parsed = new Date(cleaned);

        if (isNaN(parsed.getTime())) {
            // Try alternative parsing
            const parts = cleaned.match(/(\w+)\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
            if (parts) {
                const [, month, day, year, hour, minute, ampm] = parts;
                const months = {
                    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
                    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
                };
                let h = parseInt(hour);
                if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
                if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;

                return new Date(year, months[month.toLowerCase()], day, h, minute).toISOString();
            }
            throw new Error('Could not parse date: ' + dateStr);
        }

        return parsed.toISOString();
    } catch (error) {
        console.error('Date parsing error:', error);
        return new Date().toISOString();
    }
}

/**
 * Apex Truck Parking - Checkout Logic
 */

// State
let selectedDates = [];
let currentMonth = new Date();
let unavailableDates = {}; // { 'YYYY-MM-DD': spotsBooked }
let stripe = null;
let cardElement = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Stripe
    initStripe();

    // Load availability data
    await loadAvailability();

    // Render calendar
    renderCalendar();

    // Set up form handlers
    initForm();

    // Phone formatting
    initPhoneFormatting();
});

/**
 * Initialize Stripe Elements
 */
function initStripe() {
    if (CONFIG.STRIPE_PUBLISHABLE_KEY.includes('XXXX')) {
        console.warn('Stripe not configured - running in demo mode');
        // Create a fake card element for demo
        const cardEl = document.getElementById('card-element');
        cardEl.innerHTML = '<input type="text" placeholder="Demo Mode - Card: 4242 4242 4242 4242" style="width:100%;padding:8px;border:none;font-size:16px;">';
        return;
    }

    stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();

    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#374151',
                '::placeholder': { color: '#9ca3af' }
            }
        }
    });

    cardElement.mount('#card-element');

    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.style.display = 'block';
        } else {
            displayError.style.display = 'none';
        }
    });
}

/**
 * Load availability from backend
 */
async function loadAvailability() {
    if (CONFIG.DEV_MODE) {
        // Demo mode: simulate some unavailable dates
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = formatDateKey(date);

            // Randomly make some dates partially or fully booked
            if (Math.random() < 0.15) {
                unavailableDates[dateStr] = CONFIG.MAX_DAILY_SPOTS; // Fully booked
            } else if (Math.random() < 0.2) {
                unavailableDates[dateStr] = CONFIG.MAX_DAILY_SPOTS - 1; // Almost full
            }
        }
        return;
    }

    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/reservations?select=parking_date&status=eq.confirmed`, {
            headers: {
                'apikey': CONFIG.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const reservations = await response.json();
            // Count reservations per date
            reservations.forEach(r => {
                const dateStr = r.parking_date;
                unavailableDates[dateStr] = (unavailableDates[dateStr] || 0) + 1;
            });
        }
    } catch (error) {
        console.error('Error loading availability:', error);
    }
}

/**
 * Render the calendar
 */
function renderCalendar() {
    const grid = document.getElementById('date-grid');
    const monthLabel = document.getElementById('current-month');

    // Clear grid
    grid.innerHTML = '';

    // Set month label
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    monthLabel.textContent = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

    // Get first day of month and number of days
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before first of month
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        grid.appendChild(emptyCell);
    }

    // Add day buttons
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = formatDateKey(date);
        const isPast = date < today;
        const spotsBooked = unavailableDates[dateStr] || 0;
        const isFullyBooked = spotsBooked >= CONFIG.MAX_DAILY_SPOTS;
        const isSelected = selectedDates.includes(dateStr);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'date-btn';
        btn.textContent = day;
        btn.dataset.date = dateStr;

        if (isPast) {
            btn.disabled = true;
        } else if (isFullyBooked) {
            btn.classList.add('unavailable');
            btn.disabled = true;
            btn.title = 'Fully booked';
        } else if (isSelected) {
            btn.classList.add('selected');
        }

        btn.addEventListener('click', () => toggleDate(dateStr));
        grid.appendChild(btn);
    }
}

/**
 * Toggle date selection
 */
function toggleDate(dateStr) {
    const index = selectedDates.indexOf(dateStr);

    if (index > -1) {
        selectedDates.splice(index, 1);
    } else {
        // Check if adding this date would exceed capacity
        const spotsBooked = unavailableDates[dateStr] || 0;
        if (spotsBooked >= CONFIG.MAX_DAILY_SPOTS) {
            alert('Sorry, this date is fully booked.');
            return;
        }
        selectedDates.push(dateStr);
    }

    // Sort dates
    selectedDates.sort();

    // Update UI
    updateSelectedDatesUI();
    renderCalendar();
    updateSummary();
    updateSubmitButton();
}

/**
 * Update selected dates display
 */
function updateSelectedDatesUI() {
    const container = document.getElementById('selected-dates-list');

    if (selectedDates.length === 0) {
        container.innerHTML = '<span class="no-dates">No dates selected</span>';
        return;
    }

    container.innerHTML = selectedDates.map(dateStr => {
        const date = new Date(dateStr + 'T12:00:00');
        const formatted = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        return `
            <span class="selected-date-tag">
                ${formatted}
                <button type="button" onclick="toggleDate('${dateStr}')" aria-label="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </span>
        `;
    }).join('');
}

/**
 * Update order summary
 */
function updateSummary() {
    const dayCount = selectedDates.length;
    const total = dayCount * CONFIG.DAILY_RATE;

    document.getElementById('day-count').textContent = dayCount;
    document.getElementById('total-amount').textContent = total.toFixed(2);
}

/**
 * Update submit button state
 */
function updateSubmitButton() {
    const btn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const dayCount = selectedDates.length;

    if (dayCount === 0) {
        btn.disabled = true;
        btnText.textContent = 'Select dates to continue';
    } else {
        btn.disabled = false;
        const total = dayCount * CONFIG.DAILY_RATE;
        btnText.textContent = `Pay $${total.toFixed(2)} & Reserve`;
    }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Initialize form submission
 */
function initForm() {
    const form = document.getElementById('checkout-form');

    // Month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (selectedDates.length === 0) {
            alert('Please select at least one parking date.');
            return;
        }

        // Validate required fields
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dotNumber'];
        for (const field of requiredFields) {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                input.focus();
                alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
                return;
            }
        }

        // Show loading
        showLoading();

        try {
            // Collect form data
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                mcNumber: document.getElementById('mcNumber').value,
                dotNumber: document.getElementById('dotNumber').value,
                truckInfo: document.getElementById('truckInfo').value,
                dates: selectedDates,
                totalAmount: selectedDates.length * CONFIG.DAILY_RATE * 100, // in cents
            };

            if (CONFIG.DEV_MODE) {
                // Demo mode - simulate success with SMS preview
                await new Promise(resolve => setTimeout(resolve, 2000));
                const code = generateConfirmationCode();
                showSuccess(code, formData);
                // Show what SMS would be sent
                console.log('SMS would be sent to:', formData.phone);
                console.log('Message:', generateSMSPreview(formData, code));
                return;
            }

            // Create reservation and payment intent on server
            const response = await fetch('/api/create-reservation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const { clientSecret, confirmationCode, error } = await response.json();

            if (error) {
                throw new Error(error);
            }

            // Confirm payment with Stripe
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: `${formData.firstName} ${formData.lastName}`,
                            email: formData.email,
                            phone: formData.phone
                        }
                    }
                }
            );

            if (stripeError) {
                throw new Error(stripeError.message);
            }

            // Payment successful - SMS will be sent by webhook
            showSuccess(confirmationCode, formData);

        } catch (error) {
            hideLoading();
            const errorEl = document.getElementById('card-errors');
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
        }
    });
}

/**
 * Phone number formatting
 */
function initPhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 6) {
            value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6,10)}`;
        } else if (value.length >= 3) {
            value = `(${value.slice(0,3)}) ${value.slice(3)}`;
        }
        e.target.value = value;
    });
}

/**
 * Show loading overlay
 */
function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

/**
 * Show success state
 */
function showSuccess(confirmationCode, formData) {
    hideLoading();
    document.getElementById('checkout-form-container').style.display = 'none';
    document.getElementById('success-container').classList.add('active');
    document.getElementById('confirmation-code').textContent = confirmationCode;

    // Update gate code display
    const gateCodeEl = document.getElementById('gate-code');
    if (gateCodeEl) {
        gateCodeEl.textContent = 'Sent to your phone via SMS';
    }

    // Show SMS notification in success message
    if (formData && formData.phone) {
        const successContainer = document.getElementById('success-container');
        const smsNote = document.createElement('p');
        smsNote.style.cssText = 'margin-top: 16px; padding: 12px; background: #d1fae5; border-radius: 8px; color: #065f46;';
        smsNote.innerHTML = `<strong>📱 SMS Confirmation Sent!</strong><br>Check your phone (${formData.phone}) for gate code and details.`;
        successContainer.querySelector('.confirmation-number').after(smsNote);
    }
}

/**
 * Generate a confirmation code (demo mode)
 */
function generateConfirmationCode() {
    return 'APX-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Generate SMS preview for demo mode
 */
function generateSMSPreview(formData, confirmationCode) {
    const dateList = formData.dates.map(d => {
        const date = new Date(d + 'T12:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }).join(', ');

    const total = formData.dates.length * CONFIG.DAILY_RATE;

    return `Apex Truck Parking - Confirmed!

Hi ${formData.firstName}, your daily parking is reserved.

📍 6759 Marbut Rd, Lithonia, GA 30058

📅 ${dateList}
💰 $${total} paid

🔐 Gate Code: 1234

Conf#: ${confirmationCode}

Questions? (470) 838-2281`;
}

// Make toggleDate available globally for onclick handlers
window.toggleDate = toggleDate;

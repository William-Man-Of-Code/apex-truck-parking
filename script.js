/**
 * Apex Truck Parking - Interactive Features
 * Conversion-optimized JavaScript
 */

// Configuration
const SITE_CONFIG = {
    MAX_DAILY_SPOTS: 4,
    DAILY_RATE: 15,
    DEV_MODE: true // Set to false in production
};

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    initMobileMenu();

    // FAQ Accordion
    initFAQ();

    // Form Handling
    initContactForm();

    // Smooth Scroll
    initSmoothScroll();

    // Header scroll effect
    initHeaderScroll();

    // Create loading modal
    createLoadingModal();
});

/**
 * Create loading modal for daily parking redirect
 */
function createLoadingModal() {
    const modal = document.createElement('div');
    modal.id = 'daily-parking-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-spinner"></div>
                <h3 class="modal-title">We have daily parking available!</h3>
                <p class="modal-text">Sending you to complete your reservation...</p>
            </div>
        </div>
    `;
    modal.style.cssText = `
        display: none;
        position: fixed;
        inset: 0;
        z-index: 10000;
    `;

    const style = document.createElement('style');
    style.textContent = `
        #daily-parking-modal .modal-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        #daily-parking-modal .modal-content {
            background: white;
            padding: 48px;
            border-radius: 16px;
            text-align: center;
            max-width: 400px;
            animation: modalPop 0.3s ease;
        }
        @keyframes modalPop {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        #daily-parking-modal .modal-spinner {
            width: 56px;
            height: 56px;
            border: 4px solid #e5e7eb;
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 24px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        #daily-parking-modal .modal-title {
            font-size: 22px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 12px;
        }
        #daily-parking-modal .modal-text {
            color: #6b7280;
            font-size: 16px;
        }
        #daily-parking-modal .modal-full {
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
        }
        #daily-parking-modal .modal-full-title {
            color: #991b1b;
            font-weight: 600;
            margin-bottom: 8px;
        }
        #daily-parking-modal .modal-full-text {
            color: #991b1b;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

/**
 * Show the daily parking modal
 */
function showDailyParkingModal(isAvailable = true) {
    const modal = document.getElementById('daily-parking-modal');
    const content = modal.querySelector('.modal-content');

    if (isAvailable) {
        content.innerHTML = `
            <div class="modal-spinner"></div>
            <h3 class="modal-title">We have daily parking available!</h3>
            <p class="modal-text">Sending you to complete your reservation...</p>
        `;
    } else {
        content.innerHTML = `
            <h3 class="modal-title">Daily Parking Update</h3>
            <div class="modal-full">
                <div class="modal-full-title">Currently at Capacity</div>
                <p class="modal-full-text">Our daily parking spots are fully booked for today. Please call us to check availability for other dates.</p>
            </div>
            <a href="tel:+14708382281" style="display: inline-block; margin-top: 20px; padding: 14px 28px; background: #1e40af; color: white; border-radius: 8px; font-weight: 600; text-decoration: none;">
                Call (470) 838-2281
            </a>
            <button onclick="document.getElementById('daily-parking-modal').style.display='none'" style="display: block; margin: 16px auto 0; background: none; border: none; color: #6b7280; cursor: pointer; font-size: 14px;">
                Close
            </button>
        `;
    }

    modal.style.display = 'block';
}

/**
 * Check daily parking availability
 */
async function checkDailyAvailability() {
    if (SITE_CONFIG.DEV_MODE) {
        // Demo mode: simulate availability check
        // In production, this would check Supabase
        const spotsBooked = Math.floor(Math.random() * 3); // 0-2 spots booked
        return spotsBooked < SITE_CONFIG.MAX_DAILY_SPOTS;
    }

    // Production: Check Supabase
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
            `${CONFIG.SUPABASE_URL}/rest/v1/reservations?parking_date=eq.${today}&status=eq.confirmed&select=id`,
            {
                headers: {
                    'apikey': CONFIG.SUPABASE_ANON_KEY
                }
            }
        );
        const reservations = await response.json();
        return reservations.length < SITE_CONFIG.MAX_DAILY_SPOTS;
    } catch (error) {
        console.error('Error checking availability:', error);
        return true; // Default to available on error
    }
}

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('active');
        menuBtn.classList.toggle('active');
    });

    // Close menu when clicking a link
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            menuBtn.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
            mobileMenu.classList.remove('active');
            menuBtn.classList.remove('active');
        }
    });
}

/**
 * FAQ Accordion
 */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', function() {
            // Close other items
            faqItems.forEach(other => {
                if (other !== item) {
                    other.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

/**
 * Contact Form Handling
 */
function initContactForm() {
    const form = document.getElementById('reservation-form');

    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Basic validation
        if (!data.name || !data.phone || !data['parking-type']) {
            alert('Please fill in all required fields.');
            return;
        }

        const parkingType = data['parking-type'];

        // DAILY PARKING: Check availability and redirect to checkout
        if (parkingType === 'daily') {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Checking availability...';
            submitBtn.disabled = true;

            const isAvailable = await checkDailyAvailability();

            if (isAvailable) {
                showDailyParkingModal(true);

                // Store contact info for checkout pre-fill
                sessionStorage.setItem('apex_contact', JSON.stringify({
                    name: data.name,
                    phone: data.phone,
                    email: data.email || ''
                }));

                // Redirect after showing modal
                setTimeout(() => {
                    window.location.href = 'checkout.html';
                }, 2000);
            } else {
                showDailyParkingModal(false);
                submitBtn.textContent = 'Submit Reservation Request';
                submitBtn.disabled = false;
            }
            return;
        }

        // MONTHLY/FLEET: Show standard submission flow
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        // Simulate form submission
        setTimeout(function() {
            // Show success message
            form.innerHTML = `
                <div class="form-success">
                    <div class="form-success-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </div>
                    <h3>Request Submitted!</h3>
                    <p>Thank you for your interest in ${parkingType} parking. We'll contact you within 24 hours to confirm your reservation.</p>
                    <p class="mt-4"><strong>Need immediate assistance?</strong></p>
                    <a href="tel:+14708382281" class="btn btn-primary mt-4">Call Us Now</a>
                </div>
            `;

            // Track conversion
            if (typeof gtag === 'function') {
                gtag('event', 'form_submission', {
                    'event_category': 'Contact',
                    'event_label': parkingType
                });
            }

        }, 1500);
    });

    // Phone number formatting
    const phoneInput = form.querySelector('#phone');
    if (phoneInput) {
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

    // Set minimum date to today
    const dateInput = form.querySelector('#start-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
}

/**
 * Smooth Scroll for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();

            const target = document.querySelector(href);
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const callBarHeight = window.innerWidth <= 768 ? 44 : 0;
                const offset = headerHeight + callBarHeight + 20;

                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Header scroll effect
 */
function initHeaderScroll() {
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            header.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)';
        } else {
            header.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
        }

        lastScroll = currentScroll;
    });
}

/**
 * Utility: Format phone number for tel: links
 */
function formatPhoneForTel(phone) {
    return '+1' + phone.replace(/\D/g, '');
}

/**
 * Track phone calls (for analytics)
 */
document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', function() {
        if (typeof gtag === 'function') {
            gtag('event', 'phone_call', {
                'event_category': 'Contact',
                'event_label': 'Click to Call'
            });
        }
    });
});

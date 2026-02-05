/**
 * Apex Truck Parking - Configuration
 * Frontend configuration with publishable keys only
 */

const CONFIG = {
    // Stripe Publishable Key (safe for frontend)
    STRIPE_PUBLISHABLE_KEY: 'pk_live_51Odc9BF9mt2bt7VPe4nFJX0zF0I6OQvooxpOgrTgyoqJq61fNr3EtiwLieqA4P7QMDdELd8I4MU9BpfOxNoWM8QT00sqEmc9B6',

    // Supabase Configuration (public keys only)
    SUPABASE_URL: 'https://yxnvpebwbwlcgbkgdtpp.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_LahKRu6buj4jSqkMurjyEA_4HJahJ9R',

    // Business Configuration
    DAILY_RATE: 20,
    MAX_DAILY_SPOTS: 4,

    // Contact
    BUSINESS_PHONE: '(470) 838-2281',
    BUSINESS_ADDRESS: '6759 Marbut Road, Lithonia, GA 30058',

    // Set to false for production
    DEV_MODE: false,
};

// Don't modify below this line
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

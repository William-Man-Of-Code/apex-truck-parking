# Apex Truck Parking Website

A conversion-optimized website for Apex Truck Parking in Lithonia, GA.

## Quick Setup

### 1. Update Your Phone Number

Replace all instances of `(XXX) XXX-XXXX` and `+1XXXXXXXXXX` with your actual phone number.

**Quick command (run in terminal):**

```bash
cd ~/apex-truck-parking

# Replace with your actual phone number (example: 770-555-1234)
sed -i '' 's/(XXX) XXX-XXXX/(770) 555-1234/g' index.html
sed -i '' 's/+1XXXXXXXXXX/+17705551234/g' index.html
sed -i '' 's/+1XXXXXXXXXX/+17705551234/g' script.js
```

### 2. Test Locally

Open `index.html` in your browser to preview the site.

### 3. Deploy Options

**Option A: Replace Wix Site**
1. Export your Wix domain or point it to a new host
2. Upload these files to any web host (Netlify, Vercel, etc.)

**Option B: Netlify (Free & Easy)**
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `apex-truck-parking` folder
3. Get a free URL instantly
4. Connect your custom domain

**Option C: Vercel (Free)**
1. Go to [vercel.com](https://vercel.com)
2. Import from folder
3. Connect custom domain

## Form Submissions

The contact form currently shows a success message but doesn't send emails. To receive form submissions:

### Option 1: Formspree (Easiest)
1. Go to [formspree.io](https://formspree.io) and create a free account
2. Create a new form and get your form ID
3. Update the form tag in `index.html`:
```html
<form class="contact-form" id="reservation-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```
4. Remove the JavaScript form handler in `script.js` (the `initContactForm` function)

### Option 2: Netlify Forms
If hosting on Netlify, add `netlify` attribute to form:
```html
<form class="contact-form" id="reservation-form" netlify>
```

## Customization

### Update Pricing
Edit the pricing cards in `index.html` (search for "pricing-card")

### Update Amenities
If you add restrooms or other amenities, update the amenities section in `index.html`

### Add Google Analytics
Add before `</head>`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Add Google Maps Embed
Update the iframe in the location section with your actual Google Maps embed code:
1. Go to Google Maps
2. Search for your address
3. Click Share → Embed a map
4. Copy the iframe code and replace the existing one

## File Structure

```
apex-truck-parking/
├── index.html      # Main HTML file
├── styles.css      # All styles
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Features

- Mobile-first responsive design
- Sticky call bar on mobile
- Floating call button
- FAQ accordion
- Contact form with validation
- Smooth scrolling
- SEO optimized with schema markup
- Fast loading (no heavy frameworks)

## SEO Checklist

- [x] Title tag optimized
- [x] Meta description
- [x] Schema.org LocalBusiness markup
- [x] Open Graph tags
- [x] Mobile responsive
- [x] Fast loading
- [ ] Add real photos of your lot
- [ ] Get Google reviews and link to them
- [ ] Submit to Google Business Profile

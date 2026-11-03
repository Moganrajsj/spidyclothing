/**
 * Single source of truth for every public policy page.
 *
 * Edit the text, dates or contact details here — all four policy pages and
 * the footer read from this file. Do not add company registration numbers,
 * street addresses or phone numbers unless they have been verified.
 */

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
};

export type LegalPageContent = {
  slug: LegalSlug;
  path: string;
  title: string;
  shortTitle: string;
  kicker: string;
  summary: string;
  effectiveDate: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export type LegalSlug = 'privacy-policy' | 'cookie-policy' | 'return-refund-policy' | 'terms-and-conditions';

export const LEGAL_CONTACT = {
  businessName: 'SPIDY CLOTHING',
  website: 'https://spidyclothing.com',
  email: 'support@spidyclothing.com',
} as const;

export const LEGAL_PAGES: Record<LegalSlug, LegalPageContent> = {
  'privacy-policy': {
    slug: 'privacy-policy',
    path: '/privacy-policy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    kicker: 'LEGAL · YOUR DATA',
    summary: 'How SPIDY CLOTHING collects, uses, stores and protects your personal information.',
    effectiveDate: '2 November 2026',
    lastUpdated: '2 November 2026',
    sections: [
      {
        heading: 'Introduction',
        paragraphs: [
          'Welcome to SPIDY CLOTHING. We respect your privacy and are committed to protecting the personal information of customers and visitors who use our website.',
          'This Privacy Policy explains how SPIDY CLOTHING collects, uses, stores, processes and protects personal information when you browse our website, create an account, place an order, contact us or interact with our communications and advertisements.',
          'By using our website, you acknowledge this Privacy Policy. If you do not agree with it, please do not use the website or provide personal information to us.',
        ],
      },
      {
        heading: 'Who we are',
        paragraphs: [
          'SPIDY CLOTHING operates the website at https://spidyclothing.com and is responsible for the personal information described in this policy.',
          'For privacy questions, requests or complaints, contact us at support@spidyclothing.com. Our postal address and telephone number are not published on this page; if you need them for a legitimate privacy request, email us and we will provide the appropriate details.',
        ],
      },
      {
        heading: 'Information we collect',
        paragraphs: [
          'We collect information you give us directly, information created when you shop with us, and limited technical information generated when you use the website.',
        ],
        bullets: [
          'Account information: full name, email address, mobile number, account login credentials and, if you sign in with Google, your Google account identifier and profile picture.',
          'Order and delivery information: products purchased, sizes and colours, order history, order amount, discount and coupon usage, payment status, delivery name, phone number, billing and shipping address, and any return, exchange or refund request you send us.',
          'Saved shopping information: the items in your cart and wishlist. This is stored in your browser and, when you are signed in, linked to your account.',
          'Communications: your email address and the contents of messages you send to our support email address, and your email address when you subscribe to our newsletter.',
          'Technical information: IP address, browser type, device information, operating system, pages requested, timestamps and referral information contained in standard server and hosting logs.',
          'Consent records: your cookie and marketing choices and the time you made or changed them.',
        ],
        note: 'We do not store card numbers, UPI credentials or other payment instrument details on our servers. Cash on Delivery is currently the only checkout method; see “Payments” below.',
      },
      {
        heading: 'How we use your information',
        bullets: [
          'Create and manage your customer account.',
          'Process, pack, deliver and support orders, including order status and delivery updates.',
          'Process returns, exchanges, refunds and warranty or damage claims.',
          'Respond to enquiries, complaints and privacy requests.',
          'Maintain your cart, wishlist and recently viewed products.',
          'Send promotional communications where you have subscribed or where otherwise permitted by law.',
          'Operate, secure, troubleshoot and improve the website.',
          'Detect and prevent fraud, abuse and unauthorised access.',
          'Measure website and advertising performance where you have consented.',
          'Comply with accounting, tax and other legal obligations.',
        ],
      },
      {
        heading: 'Legal bases for processing',
        paragraphs: [
          'Where applicable data protection law requires a legal basis, we rely on one or more of the following: your consent (for example optional analytics and advertising cookies, and marketing emails); performance of a contract (account, order, delivery and returns); compliance with legal obligations (tax, accounting and lawful requests); and our legitimate interests in operating a secure, functional store, preventing fraud and improving our products and website.',
          'You can withdraw consent at any time using the cookie preferences or by contacting us. Withdrawal does not affect processing that already took place.',
        ],
      },
      {
        heading: 'Cookies and similar technologies',
        paragraphs: [
          'We use cookies, localStorage and sessionStorage to keep you signed in, remember your cart and wishlist, store your cookie choices and understand website performance. Optional analytics and advertising technologies are loaded only after the required consent.',
          'The full list of cookies and storage keys, their purposes and how to manage them is in our Cookie Policy at /cookie-policy.',
        ],
      },
      {
        heading: 'Google Sign-In',
        paragraphs: [
          'If you choose to sign in using Google, Google authenticates your account and shares the information you authorise, which may include your name, email address, Google account identifier and profile picture. Our sign-in request uses the openid, email and profile scopes.',
          'We use this information only to create or access your SPIDY CLOTHING account and to display your profile in the account area. We do not request access to your Gmail, Drive, contacts or other Google content.',
        ],
      },
      {
        heading: 'Analytics, Google Ads and Meta',
        paragraphs: [
          'We may use Google Analytics, Google Ads conversion measurement and Meta Pixel / Meta advertising tools to understand website activity, measure campaigns and show relevant advertising. These tools are not enabled by default in our storefront: they are loaded only when the relevant service is configured and you have granted the matching consent.',
          'When enabled and consented, these services may receive information such as page visits, product views, add-to-cart activity, checkout and purchase activity, advertising interactions, device and browser information, and an approximate location derived from your IP address. They may set or read cookies and similar identifiers.',
          'Where Google tags are used, we apply Google Consent Mode. Analytics and advertising storage are denied by default and updated only according to your choices. You can change your choices at any time through “Cookie preferences” in the footer or your browser settings.',
          'You can also manage advertising personalisation through your Google and Meta account settings.',
        ],
      },
      {
        heading: 'How we share information',
        paragraphs: [
          'We do not sell customers’ personal information as a business practice.',
          'We share information only with service providers that help us operate the store, when required by law, or as part of a business transfer. Service providers process information under their own terms and privacy policies and are given only what they need to perform their services.',
        ],
        bullets: [
          'Hostinger — website hosting, database infrastructure and server logs.',
          'Cloudinary — product image storage, optimisation and delivery.',
          'Google — Google Sign-In authentication and, only when enabled and consented, Google Analytics and Google Ads.',
          'Meta Platforms (Facebook and Instagram) — only when Meta advertising tools are enabled and consented.',
          'Fontshare — delivery of the website’s web fonts, which may involve your IP address and device information.',
          'Professional advisers, auditors and authorities — where necessary to comply with law, enforce our terms or protect rights and safety.',
        ],
      },
      {
        heading: 'Payments',
        paragraphs: [
          'Cash on Delivery is the active checkout method. We record the order amount and payment status in our database so we can reconcile deliveries and refunds.',
          'The website does not currently connect to an online payment gateway. If we introduce UPI, card or other online payments, we will update this policy and the checkout information before those methods go live.',
        ],
      },
      {
        heading: 'International transfers',
        paragraphs: [
          'Some service providers (including Cloudinary, Google and Meta) may process information in countries other than India. Where required, we rely on appropriate contractual or legal safeguards and take reasonable steps to ensure information receives an adequate level of protection.',
        ],
      },
      {
        heading: 'Data storage and security',
        paragraphs: [
          'We take reasonable technical and organisational measures to protect personal information against unauthorised access, disclosure, alteration or destruction. Account passwords are stored as salted hashes, sessions are protected with HTTP-only cookies, and access to the admin area requires authentication.',
          'However, no internet transmission or electronic storage system can be guaranteed to be completely secure. Please use a strong, unique password and keep your account credentials private.',
        ],
      },
      {
        heading: 'Data retention',
        paragraphs: [
          'We retain personal information only for as long as reasonably necessary for order processing, customer support, accounting and legal obligations, fraud prevention and business operations. When information is no longer required, we take reasonable steps to delete or anonymise it, subject to applicable law.',
          'Server logs and backups may persist for a limited period under our hosting provider’s retention practices.',
        ],
      },
      {
        heading: 'Your privacy rights',
        paragraphs: ['Subject to applicable law, you may have the right to:'],
        bullets: [
          'Request access to the personal information we hold about you.',
          'Request correction of inaccurate or incomplete information.',
          'Request deletion of personal information where legally permissible.',
          'Withdraw consent where processing is based on consent, including optional cookies and marketing.',
          'Object to or restrict certain processing.',
          'Raise a privacy-related complaint with us or, where available, a supervisory authority.',
        ],
        note: 'To exercise a right, email support@spidyclothing.com with enough detail for us to verify and respond to your request. We aim to respond within the time required by applicable law.',
      },
      {
        heading: 'Children’s privacy',
        paragraphs: [
          'Our website is intended for general consumers and is not specifically directed at children. We do not knowingly collect personal information from children in violation of applicable law. If we become aware that such information has been collected improperly, we will take appropriate steps to delete it.',
        ],
      },
      {
        heading: 'Third-party websites',
        paragraphs: [
          'Our website may contain links to external websites and services, including social media and Google/Meta advertising pages. We are not responsible for the privacy practices or content of third-party websites. Please review their privacy policies independently.',
        ],
      },
      {
        heading: 'Changes to this policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. Any updates will be published on this page with a revised effective and last-updated date. Where changes are material, we will take reasonable steps to bring them to your attention.',
        ],
      },
      {
        heading: 'Contact information',
        paragraphs: [
          'For privacy-related questions, requests or complaints, contact:',
          'SPIDY CLOTHING',
          'Website: https://spidyclothing.com',
          'Email: support@spidyclothing.com',
        ],
      },
    ],
  },

  'cookie-policy': {
    slug: 'cookie-policy',
    path: '/cookie-policy',
    title: 'Cookie Policy',
    shortTitle: 'Cookies',
    kicker: 'LEGAL · COOKIES',
    summary: 'What cookies and browser storage SPIDY CLOTHING uses, and how you control them.',
    effectiveDate: '2 November 2026',
    lastUpdated: '2 November 2026',
    sections: [
      {
        heading: 'What are cookies?',
        paragraphs: [
          'Cookies are small text files stored on your device when you visit a website. They help websites remember preferences, maintain login sessions, improve functionality and understand visitor activity.',
          'We also use browser localStorage and sessionStorage for similar purposes. References to “cookies” in this policy include these storage technologies unless stated otherwise.',
        ],
      },
      {
        heading: 'Our consent approach',
        paragraphs: [
          'Essential cookies are needed for the website to work and are used without optional consent. Non-essential analytics and advertising technologies are off by default and are loaded only after you make a choice.',
          'On your first visit, a consent banner offers Accept all, Reject non-essential and Customize. Your choice is stored in localStorage under spidy-consent-v1. You can change or withdraw it at any time using “Cookie preferences” in the footer.',
        ],
      },
      {
        heading: 'Types of cookies we use',
        bullets: [
          'Strictly necessary — customer login sessions, admin login sessions, Google sign-in security state, cart/checkout operation, security and fraud prevention, and storage of your cookie choice.',
          'Functional — remembering your cart, wishlist, recently viewed products, coupon code and the account owner marker on this device.',
          'Analytics — Google Analytics, only when configured and you have granted analytics consent, to understand page views, popular products, traffic sources and website performance.',
          'Advertising — Google Ads and Meta Pixel / Meta advertising tools, only when configured and you have granted advertising consent, to measure conversions, understand interactions and show relevant advertising.',
        ],
      },
      {
        heading: 'Cookies and storage used by this website',
        bullets: [
          'spidy_session — essential login session for customers; HTTP-only cookie; expires after approximately 30 days; used only when you sign in.',
          'spidy_admin_session — essential login session for authorised staff in the admin area; HTTP-only cookie; expires after approximately 1 day.',
          'spidy_oauth_state and spidy_oauth_next — essential temporary cookies used during Google sign-in to prevent request forgery and remember where to return you; expire after approximately 10 minutes.',
          'spidy-consent-v1 — essential preference stored in localStorage that remembers your cookie choices.',
          'spidy-cart-v2 and spidy-wishlist-v2 — functional localStorage entries that keep your cart and wishlist on this device until you clear them or sign out.',
          'spidy-data-owner-v1 — functional localStorage marker that links saved guest cart/wishlist data to the signed-in account on this device.',
          'spidy-recently-viewed — functional localStorage entry that remembers up to eight recently viewed products.',
          'spidy-coupon-v2 and spidy-coupon-discount-v2 — functional sessionStorage entries that keep an applied coupon during your browsing session.',
          'Google Analytics cookies such as _ga and _ga_* — analytics cookies, set only when analytics is configured and consented.',
          'Google Ads cookies such as _gcl_* and conversion identifiers — advertising cookies, set only when Google Ads is configured and advertising is consented.',
          'Meta cookies such as _fbp and _fbc — advertising cookies, set only when Meta Pixel is configured and advertising is consented.',
        ],
        note: 'Cookie names may vary slightly with provider updates. Third-party cookies are controlled by the relevant provider and described in its own policy.',
      },
      {
        heading: 'Third-party cookies and services',
        paragraphs: [
          'When enabled, Google and Meta may set cookies or receive identifiers through our website. Their use is governed by their respective privacy policies.',
          'Our hosting and image-delivery providers (Hostinger and Cloudinary) process requests needed to serve the website and product images and may keep standard server logs. They are described in our Privacy Policy.',
        ],
      },
      {
        heading: 'Managing your cookie preferences',
        bullets: [
          'Use “Cookie preferences” in the website footer to accept, reject or customize optional cookies at any time.',
          'Use the consent banner that appears before you make a choice.',
          'Use your browser settings to block or delete cookies and site data. Blocking essential cookies may prevent login, cart or checkout from working.',
          'Use Google advertising settings and Meta advertising preferences to manage personalised advertising on those platforms.',
        ],
      },
      {
        heading: 'Google Consent Mode',
        paragraphs: [
          'Where Google tags are configured, we set Google Consent Mode defaults so analytics and advertising storage are denied until you consent. When you change your choice, we send a consent update to Google. If you reject optional cookies, Google tags remain limited and Meta Pixel is not loaded.',
        ],
      },
      {
        heading: 'Withdrawing consent',
        paragraphs: [
          'Choosing “Reject non-essential”, unchecking optional categories, or clearing your consent choice withdraws optional consent for future processing. We stop sending optional analytics and advertising events and revoke Meta consent. Some cookies already set by third parties can be removed through your browser settings.',
        ],
      },
      {
        heading: 'Updates',
        paragraphs: [
          'We may update this Cookie Policy as our website technologies and advertising services change. The revised policy will be published on this page with an updated date.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['SPIDY CLOTHING', 'Website: https://spidyclothing.com', 'Email: support@spidyclothing.com'],
      },
    ],
  },

  'return-refund-policy': {
    slug: 'return-refund-policy',
    path: '/return-refund-policy',
    title: 'Return, Refund & Exchange Policy',
    shortTitle: 'Returns & refunds',
    kicker: 'CUSTOMER CARE · RETURNS',
    summary: 'How to request a return, exchange or refund, and what happens next.',
    effectiveDate: '2 November 2026',
    lastUpdated: '2 November 2026',
    sections: [
      {
        heading: 'Our commitment',
        paragraphs: [
          'Thank you for shopping with SPIDY CLOTHING. Customer satisfaction is important to us. We aim to provide quality clothing and a smooth shopping experience.',
          'Please read these return, refund and exchange conditions carefully before placing an order. Nothing in this policy limits rights available to customers under applicable Indian consumer protection laws.',
        ],
      },
      {
        heading: 'Return window',
        paragraphs: [
          'Customers may request a return or exchange within 7 days of receiving their order. Requests submitted after this period may not be accepted unless required by applicable law.',
        ],
      },
      {
        heading: 'Eligibility for returns',
        paragraphs: ['A product may qualify for return if:'],
        bullets: [
          'It is unused and unworn.',
          'It is unwashed.',
          'It is in its original condition.',
          'Original tags and labels are attached.',
          'Original packaging is retained, where applicable.',
          'Proof of purchase or order details are provided.',
        ],
      },
      {
        heading: 'Non-returnable products',
        paragraphs: ['The following may not be eligible for return or exchange unless defective, damaged or otherwise required by applicable law:'],
        bullets: [
          'Products showing signs of use or washing.',
          'Products with removed or damaged tags.',
          'Products damaged after delivery due to customer handling.',
          'Products returned without necessary order information.',
          'Items specifically marked as non-returnable before purchase.',
        ],
      },
      {
        heading: 'Damaged, defective or incorrect products',
        paragraphs: [
          'If you receive a damaged, defective or incorrect product, or a product different from its description, please contact our support team within 48 hours of delivery.',
          'Provide your order number, product details and clear photographs or video showing the issue. We will review the request and provide an appropriate resolution, including replacement, exchange or refund where applicable.',
        ],
      },
      {
        heading: 'Exchange policy',
        paragraphs: [
          'Customers may request an exchange for another size or eligible product within the return window. Exchange requests depend on product availability. If the requested size or product is unavailable, we may offer an alternative resolution.',
        ],
      },
      {
        heading: 'Refund policy',
        paragraphs: [
          'Approved refunds will be processed through the original payment method wherever possible. Because Cash on Delivery is currently the active payment method, the customer may be asked to provide valid bank account details or another supported refund method.',
          'Refund processing begins after the returned product has been received and inspected. Refund processing times may vary depending on the payment provider and banking institution.',
        ],
      },
      {
        heading: 'Return shipping charges',
        paragraphs: [
          'For products that are damaged, defective or incorrectly delivered, SPIDY CLOTHING will arrange an appropriate return solution, subject to verification.',
          'For other eligible returns or exchanges, the customer is responsible for return shipping charges. We will tell you the expected cost before you send anything back.',
        ],
      },
      {
        heading: 'Order cancellation',
        paragraphs: [
          'Customers may request cancellation before the order is dispatched. Once an order has been shipped, cancellation may not be possible. Customers can contact support to discuss available options.',
        ],
      },
      {
        heading: 'How to request a return or exchange',
        paragraphs: ['To request a return or exchange:'],
        bullets: [
          'Email support@spidyclothing.com from the email address used for the order, or contact us with your order details.',
          'Provide your order number.',
          'Explain the reason for the request.',
          'Share photographs or videos if applicable.',
          'Follow the return instructions provided by our team.',
        ],
        note: 'Do not send products to any address without receiving return instructions. We will share the correct return address after your request is approved.',
      },
      {
        heading: 'Important information',
        bullets: [
          'Returned products are subject to inspection.',
          'Refunds are issued only after approval.',
          'Exchanges depend on stock availability.',
          'We reserve the right to reject requests that do not meet the stated eligibility conditions, subject to applicable consumer protection laws.',
        ],
      },
      {
        heading: 'Contact information',
        paragraphs: ['SPIDY CLOTHING', 'Website: https://spidyclothing.com', 'Email: support@spidyclothing.com'],
      },
    ],
  },

  'terms-and-conditions': {
    slug: 'terms-and-conditions',
    path: '/terms-and-conditions',
    title: 'Terms & Conditions',
    shortTitle: 'Terms',
    kicker: 'LEGAL · USING OUR STORE',
    summary: 'The rules that apply when you browse, create an account or order from SPIDY CLOTHING.',
    effectiveDate: '2 November 2026',
    lastUpdated: '2 November 2026',
    sections: [
      {
        heading: 'Acceptance of these terms',
        paragraphs: [
          'These Terms & Conditions govern your access to and use of the SPIDY CLOTHING website at https://spidyclothing.com, including accounts, orders, returns and communications.',
          'By using the website or placing an order, you agree to these terms and to our Privacy Policy, Cookie Policy and Return, Refund & Exchange Policy. If you do not agree, please do not use the website.',
        ],
      },
      {
        heading: 'About SPIDY CLOTHING',
        paragraphs: [
          'SPIDY CLOTHING is a menswear retailer operating this website. You can contact us at support@spidyclothing.com. Our postal address and telephone number are not published here; we will provide the appropriate details when needed for an order, return or legal request.',
        ],
      },
      {
        heading: 'Eligibility',
        paragraphs: [
          'You must be at least 18 years old, or have the consent of a parent or legal guardian, to create an account or place an order. By using the website, you confirm that the information you provide is accurate and that you are authorised to use the payment and delivery details you submit.',
        ],
      },
      {
        heading: 'Accounts and security',
        bullets: [
          'You are responsible for keeping your login credentials confidential.',
          'You must not share your account or use another person’s account without permission.',
          'You must tell us promptly if you suspect unauthorised access to your account.',
          'We may suspend or close an account that is used for fraud, abuse or a breach of these terms.',
        ],
      },
      {
        heading: 'Product information and images',
        paragraphs: [
          'We try to describe products, fabrics, sizes and colours accurately. Product images are stored and delivered through Cloudinary and may be optimised for different screen sizes. Colours and textures can look different depending on your device and lighting, so minor variation is not a defect.',
          'Measurements and fit guidance are approximate. If you are unsure, contact us before ordering.',
        ],
      },
      {
        heading: 'Pricing and availability',
        paragraphs: [
          'Prices are shown in Indian Rupees (₹) and include applicable taxes unless stated otherwise. Shipping charges are added at checkout; orders with a subtotal of ₹1,499 or more currently qualify for free standard shipping, otherwise a ₹79 shipping charge applies.',
          'Products are subject to availability. We may correct pricing or availability errors and cancel or refuse an order affected by an error, with a refund of any amount already paid.',
        ],
      },
      {
        heading: 'Orders and acceptance',
        paragraphs: [
          'An order is an offer to buy. We may accept or decline it, including where stock is unavailable, delivery is not possible, fraud is suspected or the order contains an error. The order confirmation shown on the website or in your account records the details we received.',
          'Please check your delivery details before submitting an order. If you need to change an order, contact us as soon as possible; changes may not be possible once it has been dispatched.',
        ],
      },
      {
        heading: 'Payments',
        paragraphs: [
          'Cash on Delivery is currently the active payment method. You pay the courier when the order arrives. We record the payment status in our system so we can reconcile deliveries and process refunds.',
          'The website does not currently connect to an online payment gateway. If UPI, card or other online payment methods are introduced, additional payment terms may apply and will be shown at checkout.',
        ],
      },
      {
        heading: 'Shipping and delivery',
        paragraphs: [
          'We aim to dispatch orders within the timelines communicated at checkout or by support. Delivery estimates are not guarantees and may be affected by courier delays, weather, public holidays or events outside our control.',
          'Risk in the goods passes to you on delivery. Please inspect your parcel on arrival and report damage or an incorrect item within 48 hours, as described in our Return, Refund & Exchange Policy.',
        ],
      },
      {
        heading: 'Returns, refunds and exchanges',
        paragraphs: [
          'Returns, refunds and exchanges are governed by our Return, Refund & Exchange Policy at /return-refund-policy. That policy forms part of these terms.',
        ],
      },
      {
        heading: 'Coupons and promotions',
        bullets: [
          'Coupons may be subject to minimum order values, expiry dates, usage limits and product exclusions.',
          'Unless stated otherwise, one coupon may be used per order and coupons cannot be combined.',
          'Coupons have no cash value and may not be transferred or resold.',
          'We may withdraw or correct a promotion affected by error or misuse.',
        ],
      },
      {
        heading: 'Intellectual property',
        paragraphs: [
          'The website, brand name, logos, text, product photography, layout and other content are owned by or licensed to SPIDY CLOTHING and are protected by applicable intellectual property laws. You may view and use the website for personal, non-commercial shopping. You may not copy, reproduce, scrape, resell or create derivative works from our content without written permission.',
        ],
      },
      {
        heading: 'Acceptable use',
        bullets: [
          'Do not use the website for unlawful, fraudulent or harmful purposes.',
          'Do not attempt to gain unauthorised access to accounts, the admin area, servers or databases.',
          'Do not upload or transmit malware, spam or content that infringes another person’s rights.',
          'Do not interfere with the website’s operation, security or other customers’ use.',
          'Do not use automated tools to scrape or overload the website without our permission.',
        ],
      },
      {
        heading: 'Third-party links and services',
        paragraphs: [
          'The website links to third-party services such as Google, Meta, Instagram, Facebook and YouTube. We do not control those services and are not responsible for their content, availability or privacy practices. Your use of them is governed by their own terms.',
        ],
      },
      {
        heading: 'Disclaimers',
        paragraphs: [
          'The website and its content are provided on an “as available” basis. We do not guarantee uninterrupted, error-free or secure access. To the extent permitted by law, we disclaim implied warranties that are not expressly stated in these terms.',
          'Nothing in these terms excludes or limits any right or remedy you have under applicable consumer protection law that cannot lawfully be excluded.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'To the extent permitted by law, SPIDY CLOTHING is not liable for indirect, incidental or consequential loss, loss of profits, loss of data or loss arising from events outside our reasonable control. Our total liability for an order is limited to the amount paid for that order, except where applicable law requires otherwise.',
        ],
      },
      {
        heading: 'Indemnity',
        paragraphs: [
          'You agree to indemnify SPIDY CLOTHING against reasonable losses, claims and costs arising from your breach of these terms, your misuse of the website or your violation of another person’s rights, to the extent permitted by law.',
        ],
      },
      {
        heading: 'Governing law and jurisdiction',
        paragraphs: [
          'These terms are governed by the laws of India. Subject to applicable consumer protection rights, disputes will be handled by the courts having jurisdiction over SPIDY CLOTHING’s place of business.',
        ],
      },
      {
        heading: 'Changes to these terms',
        paragraphs: [
          'We may update these terms from time to time. The revised version will be published on this page with an updated date. Continued use of the website after publication means you accept the revised terms.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: ['Questions about these terms? Contact us:', 'SPIDY CLOTHING', 'Website: https://spidyclothing.com', 'Email: support@spidyclothing.com'],
      },
    ],
  },
};

export const LEGAL_PAGE_LIST = Object.values(LEGAL_PAGES);

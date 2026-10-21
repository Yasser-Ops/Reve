import { DELIVERY } from '@/lib/offer';

/**
 * Rêve's terms of service, as data.
 *
 * Every client accepts these on the portal's welcome step, and the acceptance
 * time is stored on their row, so a change here changes what the next client
 * agrees to. Bump TERMS_UPDATED_ON with every edit to the wording.
 *
 * Like lib/offer.ts, nothing here may outrun the product: each line is a
 * promise a client can hold Rêve to.
 */
export const TERMS_UPDATED_ON = '2026-10-21';

export type TermsSection = {
  heading: string;
  paragraphs: readonly string[];
};

export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      'Rêve is a design studio in Lebanon that makes digital invitations for weddings, engagements and other celebrations. These terms cover every order placed with us and every use of the client portal. By accepting them, you confirm you are 18 or older.',
    ],
  },
  {
    heading: 'Ordering and payment',
    paragraphs: [
      'Orders are agreed with us on WhatsApp. We confirm the design, the tier and the price with you before you pay.',
      'Payment is made by Whish transfer, in full, before we start. Prices are one-time payments for one invitation. There is no subscription.',
    ],
  },
  {
    heading: 'Delivery',
    paragraphs: [
      `A design from the collection is ready within ${DELIVERY.hours} hours of your payment and your details both reaching us. A Custom design is drawn from scratch, and we agree its timing with you before you pay.`,
    ],
  },
  {
    heading: 'Review and approval',
    paragraphs: [
      'You review your invitation in the portal before anyone else sees it. You can approve it or ask for changes, and we revise it until it is right.',
      'Approving tells us the content is correct and ready for your guests. We keep a copy of what you approved, so we can always check what was agreed.',
    ],
  },
  {
    heading: 'Changes after publishing',
    paragraphs: [
      'You can ask for changes after your invitation is live, on WhatsApp. The link stays the same, so anything you have already shared keeps working.',
    ],
  },
  {
    heading: 'Refunds',
    paragraphs: [
      'If you cancel before we have started on your invitation, we refund you in full. Once we have started, we do not refund, but we keep revising until you are happy with it.',
    ],
  },
  {
    heading: 'Your content',
    paragraphs: [
      'The names, dates, photographs and wording you send stay yours. You allow us to use them only to make and host your invitation. Please send only what you have the right to share, including photographs of other people.',
      'We never show your invitation in our own marketing without asking you first.',
    ],
  },
  {
    heading: 'Our designs',
    paragraphs: [
      'The artwork, animation and code of every design remain Rêve’s. Your order gives you the right to use your invitation for your event and to keep it as a keepsake. It does not allow you to copy the design or reuse it elsewhere.',
    ],
  },
  {
    heading: 'Your guests’ replies',
    paragraphs: [
      'On tiers with RSVP, guests reply on the invitation itself. Their replies are visible only to you, in your portal, and to us, so we can help you with them. We do not use them for anything else and we never sell them.',
      'You are responsible for how you use the guest list once you export it.',
    ],
  },
  {
    heading: 'Your portal account',
    paragraphs: [
      'Your account is for you. Keep your password to yourself, and tell us straight away if you think someone else has used it.',
    ],
  },
  {
    heading: 'How long your invitation stays online',
    paragraphs: [
      'Through your event and well past it, as a keepsake. If that ever changes, we will tell you before anything comes down, and you can ask us to take your invitation offline at any time.',
    ],
  },
  {
    heading: 'Liability',
    paragraphs: [
      'We take care to keep your invitation online and working, but we cannot promise it will never be interrupted. If something goes wrong on our side, the most we owe you is what you paid for the order.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'We may update these terms. The date at the top always shows the latest version, and an order follows the terms in place when it was paid.',
    ],
  },
  {
    heading: 'Law',
    paragraphs: ['These terms are governed by the laws of Lebanon.'],
  },
];

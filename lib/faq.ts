/** One question a couple asks, answered. */
export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * The questions couples ask, answered once.
 *
 * The home page renders these, the FAQPage structured data describes them and
 * /llms.txt lists them, all from this array: an answer changed here changes
 * everywhere, so the markup can never claim what the page no longer says.
 */
export const FAQS: readonly FaqItem[] = [
  {
    question: 'How long does it take?',
    answer:
      'Two days for a design from the collection. The artwork is already drawn, so there is no design phase to wait through. We set your details into it and send you the link. A Custom design is drawn from scratch and takes longer; we agree the timing with you before you pay. If your date is close, tell us on WhatsApp and we will say honestly whether we can meet it.',
  },
  {
    question: 'How do I pay?',
    answer:
      'Through Whish. You send us your details, we confirm the design and the price, and you transfer. We start once the payment lands. There is no card form on this site.',
  },
  {
    question: 'Can I change something after it is live?',
    answer:
      'Yes. Send us the change on WhatsApp and we will update the page. The link stays the same, so anything you have already shared keeps working.',
  },
  {
    question: 'Do you only do weddings?',
    answer:
      'Weddings and engagements are most of what we do, and what the collection is designed around. We also take birthdays and anniversaries, in a lighter register that suits the evening. If you are planning something else, ask, and we will tell you honestly whether we are the right studio for it.',
  },
  {
    question: 'Do you design in Arabic?',
    answer:
      'Yes. We work in English and Arabic, including bilingual invitations where the wording appears in both. Arabic calligraphy is available on the Custom tier.',
  },
  {
    question: 'What do you need from me?',
    answer:
      'Both names, the date and time, the venue with its address, and any photographs you want included. Anything else, such as a schedule, a dress code or directions, is welcome but optional.',
  },
  {
    question: 'How do guests reply?',
    answer:
      'On the Managed and Custom tiers there is an RSVP form inside the invitation. Guests fill it in on the page, and you see every reply in a private dashboard we send you.',
  },
  {
    question: 'How long does the page stay online?',
    answer:
      'Through your wedding and well past it. We keep invitations online as a keepsake, and we will tell you before anything changes.',
  },
  {
    question: 'Do guests need an app or an account?',
    answer:
      'No. They tap the link, the envelope opens, and the invitation is there. It works on any phone with a browser.',
  },
  {
    question: 'Can I see one before I buy?',
    answer:
      'Yes, and you should. There is a live example on this page. Open it on your phone, tap the seal, and see exactly what your guests would receive.',
  },
  {
    question: 'What if I do not like the design?',
    answer:
      'We revise it. You see the invitation before it goes anywhere, and we keep working on it until it is right. Nothing is shared with your guests until you approve it.',
  },
];

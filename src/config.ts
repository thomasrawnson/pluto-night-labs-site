export const site = {
  name: 'Pluto Night Labs',
  legalName: 'Pluto Night Labs Ltd',
  url: 'https://plutonightlabs.com',
  supportEmail: 'hello@plutonightlabs.com',
  businessEmail: 'tom@plutonightlabs.com',
  // Owner-supplied MailerLite-hosted Share URL, verified in a public browser.
  newsletterUrl: 'https://preview.mailerlite.io/forms/2708813/201212762701956921/share',
  socials: {
    youtube: '',
    x: '',
    instagram: '',
    github: '',
  },
} as const;

export const socialLabels: Record<keyof typeof site.socials, string> = {
  youtube: 'YouTube',
  x: 'X',
  instagram: 'Instagram',
  github: 'GitHub',
};

export const site = {
  name: 'Pluto Night Labs',
  legalName: 'Pluto Night Labs Ltd',
  url: 'https://plutonightlabs.com',
  supportEmail: 'hello@plutonightlabs.com',
  businessEmail: 'tom@plutonightlabs.com',
  // MailerLite embedded form's HTTPS Share URL. Leave blank until supplied and verified.
  newsletterUrl: '',
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

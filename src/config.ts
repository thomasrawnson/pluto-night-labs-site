export const site = {
  name: 'Pluto Night Labs',
  legalName: 'Pluto Night Labs Ltd',
  url: 'https://plutonightlabs.com',
  supportEmail: 'hello@plutonightlabs.com',
  businessEmail: 'tom@plutonightlabs.com',
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

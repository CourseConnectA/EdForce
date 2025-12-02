export type WhatsAppButton = {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
};

export type WhatsAppTemplate = {
  name: string;
  displayName: string;
  language: string; // default preview language
  header?: {
    type: 'IMAGE' | 'NONE';
    sampleImageUrl?: string; // for preview
  };
  body: string; // text with {{1}}, {{2}} placeholders
  footer?: string;
  buttons?: WhatsAppButton[];
};

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    name: 'welcome_message_image',
    displayName: 'Welcome Message (Image)',
    language: 'en_US',
    header: {
      type: 'IMAGE',
      sampleImageUrl: 'https://static.whatsapp.net/whatsapp-stickers-image.png',
    },
    body:
      'Hello {{1}},\n\nGreetings from CRATIO CRM!\n\nThanks for showing interest in our Lead Management and Sales Automation Solution.\n\nFor more information? Please choose an option below👇',
    footer: 'Reply Stop to unsubscribe',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Request a Callback' },
      { type: 'QUICK_REPLY', text: 'Explore Features' },
    ],
  },
  {
    name: 'reminder_message',
    displayName: 'Reminder Message',
    language: 'en_US',
    header: { type: 'NONE' },
    body:
      'Hello {{1}}, this is a reminder for your scheduled meeting on {{2}} regarding {{3}}. Reply YES to confirm or NO to reschedule.',
    footer: 'Reply Stop to unsubscribe',
    buttons: [
      { type: 'QUICK_REPLY', text: 'YES' },
      { type: 'QUICK_REPLY', text: 'NO' },
    ],
  },
];

export function getTemplateByName(name: string): WhatsAppTemplate | undefined {
  return WHATSAPP_TEMPLATES.find(t => t.name === name);
}

export function extractPlaceholderIndexes(body: string): number[] {
  const re = /\{\{(\d+)\}\}/g;
  const set = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    set.add(Number(m[1]));
  }
  return Array.from(set).sort((a, b) => a - b);
}

import { registerPlugin } from '@capacitor/core';

export interface WhatsAppPluginInterface {
  ping(): Promise<void>;
  openChooser(options: { phoneNumber: string }): Promise<void>;
  openWhatsApp(options: { phoneNumber: string; type?: 'normal' | 'business' }): Promise<void>;
  checkAvailability(): Promise<{ whatsapp: boolean; whatsappBusiness: boolean; anyAvailable: boolean }>;
}

export const WhatsAppPlugin = registerPlugin<WhatsAppPluginInterface>('WhatsApp');
export const WhatsAppChooserPlugin = registerPlugin<WhatsAppPluginInterface>('WhatsAppChooser');
export const EdforceWhatsAppPlugin = registerPlugin<WhatsAppPluginInterface>('EdforceWhatsApp');

export default WhatsAppPlugin;

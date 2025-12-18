import { Capacitor } from '@capacitor/core';
import { WhatsAppPlugin, WhatsAppChooserPlugin, EdforceWhatsAppPlugin } from '@/plugins/WhatsAppPlugin';
import DialerPlugin from '@/plugins/DialerPlugin';

// Using dedicated plugin wrapper ensures consistent registration across builds

/**
 * Opens the native WhatsApp chooser on Android.
 * Shows a bottom sheet with WhatsApp and WhatsApp Business options.
 * Falls back to web URL on non-Android platforms.
 */
export async function openWhatsAppChooser(phoneNumber: string): Promise<boolean> {
  console.log('🟢 openWhatsAppChooser called with:', phoneNumber);
  console.log('🟢 Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
  console.log('🟢 Capacitor.getPlatform():', Capacitor.getPlatform());
  
  if (!phoneNumber) {
    console.warn('🔴 No phone number provided for WhatsApp');
    return false;
  }

  // Clean phone number - remove spaces, dashes, parentheses
  let cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  // Remove leading + if present
  if (cleanNumber.startsWith('+')) {
    cleanNumber = cleanNumber.substring(1);
  }
  // If number doesn't start with country code, assume India (+91)
  if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }
  
  console.log('🟢 Cleaned phone number:', cleanNumber);

  // Use native plugin on Android
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    console.log('🟢 Detected Android native platform, calling WhatsAppChooser.openChooser...');
    console.log('🔍 isPluginAvailable(WhatsApp):', (Capacitor as any).isPluginAvailable?.('WhatsApp'));
    console.log('🔍 isPluginAvailable(WhatsAppChooser):', (Capacitor as any).isPluginAvailable?.('WhatsAppChooser'));
    console.log('🔍 isPluginAvailable(EdforceWhatsApp):', (Capacitor as any).isPluginAvailable?.('EdforceWhatsApp'));
    try {
      // Force-load plugin by calling ping() first
      try {
        await WhatsAppPlugin.ping();
        console.log('🟢 WhatsApp.ping succeeded');
      } catch (e1) {
        console.warn('🟡 WhatsApp.ping failed, trying WhatsAppChooser.ping...', e1);
        try {
          await WhatsAppChooserPlugin.ping();
          console.log('🟢 WhatsAppChooser.ping succeeded');
        } catch (e2) {
          console.warn('🟡 WhatsAppChooser.ping failed, trying EdforceWhatsApp.ping...', e2);
          await EdforceWhatsAppPlugin.ping();
          console.log('🟢 EdforceWhatsApp.ping succeeded');
        }
      }

      console.log('🟢 About to call WhatsApp.openChooser with:', { phoneNumber: cleanNumber });
      try {
        await WhatsAppPlugin.openChooser({ phoneNumber: cleanNumber });
      } catch (err1) {
        console.warn('🟡 WhatsApp.openChooser failed, trying WhatsAppChooser...', err1);
        try {
          await WhatsAppChooserPlugin.openChooser({ phoneNumber: cleanNumber });
        } catch (err2) {
          console.warn('🟡 WhatsAppChooser.openChooser failed, trying EdforceWhatsApp...', err2);
          await EdforceWhatsAppPlugin.openChooser({ phoneNumber: cleanNumber });
        }
      }
      console.log('🟢 WhatsAppChooser.openChooser succeeded!');
      return true;
    } catch (error: any) {
      console.error('🔴 Failed to open WhatsApp chooser:', error);
      console.error('🔴 Error message:', error?.message);
      console.error('🔴 Error stack:', error?.stack);
      // Fallback to wa.me
      console.log('🟡 Falling back to wa.me URL...');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
      return false;
    }
  } else {
    console.log('🟡 Not on Android native platform, using wa.me URL');
  }

  // On web/iOS, just open wa.me
  window.open(`https://wa.me/${cleanNumber}`, '_blank');
  return true;
}

/**
 * Check which WhatsApp apps are installed (Android only)
 */
export async function checkWhatsAppAvailability(): Promise<{
  whatsapp: boolean;
  whatsappBusiness: boolean;
  anyAvailable: boolean;
}> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      return await WhatsAppPlugin.checkAvailability();
    } catch (error) {
      console.error('Failed to check WhatsApp availability:', error);
      return { whatsapp: false, whatsappBusiness: false, anyAvailable: false };
    }
  }

  // On web/iOS, assume available
  return { whatsapp: true, whatsappBusiness: false, anyAvailable: true };
}

export default {
  openWhatsAppChooser,
  checkWhatsAppAvailability,
};

/**
 * Open specific WhatsApp variant using intent URI on Android.
 * Falls back to Play Store if not installed; otherwise to wa.me.
 */
export async function openWhatsAppSpecific(type: 'normal' | 'business', phoneNumber: string): Promise<void> {
  console.log('🟢 openWhatsAppSpecific start', { type, phoneNumber, platform: Capacitor.getPlatform?.() });
  // Clean number
  let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.slice(1);
  if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }

  const pkg = type === 'business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
  const intentUrl = `intent://send?phone=${cleanNumber}#Intent;scheme=whatsapp;package=${pkg};end`;
  const schemeUrl = `whatsapp://send?phone=${cleanNumber}`;
  // removed Play Store fallback to avoid opening store despite app installed

  try {
    // Try native plugin first if available
    try {
      console.log('🟢 Trying DialerPlugin.openWhatsApp', { pkg, cleanNumber });
      await DialerPlugin.openWhatsApp({ phoneNumber: cleanNumber, type });
      console.log('🟢 DialerPlugin.openWhatsApp succeeded');
      return;
    } catch (e1) {
      console.error('🔴 DialerPlugin.openWhatsApp failed', e1);
      try {
        console.log('🟡 Trying WhatsAppPlugin.openWhatsApp');
        await WhatsAppPlugin.openWhatsApp({ phoneNumber: cleanNumber, type });
        console.log('🟢 WhatsAppPlugin.openWhatsApp succeeded');
        return;
      } catch (e2) {
        console.error('🔴 WhatsAppPlugin.openWhatsApp failed', e2);
        try {
          console.log('🟡 Trying WhatsAppChooserPlugin.openWhatsApp');
          await WhatsAppChooserPlugin.openWhatsApp({ phoneNumber: cleanNumber, type });
          console.log('🟢 WhatsAppChooserPlugin.openWhatsApp succeeded');
          return;
        } catch (e3) {
          console.error('🔴 WhatsAppChooserPlugin.openWhatsApp failed', e3);
          try {
            console.log('🟡 Trying EdforceWhatsAppPlugin.openWhatsApp');
            await EdforceWhatsAppPlugin.openWhatsApp({ phoneNumber: cleanNumber, type });
            console.log('🟢 EdforceWhatsAppPlugin.openWhatsApp succeeded');
            return;
          } catch {
            // Fall through to intent URL
            console.warn('🟡 All native plugin attempts failed; falling back to intent URL');
          }
        }
      }
    }

    // Prefer whatsapp:// scheme (usually opens installed app directly)
    console.log('🟡 Navigating to whatsapp scheme URL', schemeUrl);
    try {
      window.location.href = schemeUrl;
    } catch (schemeErr) {
      console.warn('🟡 whatsapp scheme navigation error, falling back to intent URL', schemeErr);
      window.location.href = intentUrl;
    }
    // As a safety net, open Play Store after short delay if nothing happens
    setTimeout(() => {
      try {
        console.log('🟡 No app launch detected; falling back to wa.me');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
      } catch {
        console.log('🟡 Final fallback to wa.me');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
      }
    }, 1500);
  } catch {
    // Final fallback
    console.log('🔴 Unexpected error, final fallback to wa.me');
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  }
}

/**
 * Trigger Android's default chooser (Complete action using) for WhatsApp/Business.
 * Uses the whatsapp:// scheme without forcing a package so Android shows
 * the system dialog with "Just once" / "Always" when multiple handlers exist.
 */
export async function openWhatsAppSystemChooser(phoneNumber: string): Promise<void> {
  console.log('🟢 openWhatsAppSystemChooser start', { phoneNumber, platform: Capacitor.getPlatform?.() });
  let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.slice(1);
  if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }
  const schemeUrl = `whatsapp://send?phone=${cleanNumber}`;
  try {
    window.location.href = schemeUrl;
  } catch (err) {
    console.warn('🟡 whatsapp scheme navigation failed; falling back to wa.me', err);
    window.open(`https://wa.me/${cleanNumber}`, '_blank');
  }
}

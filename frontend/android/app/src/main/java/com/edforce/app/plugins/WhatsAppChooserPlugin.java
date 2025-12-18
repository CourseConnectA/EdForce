package com.edforce.app.plugins;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.material.bottomsheet.BottomSheetDialog;

@CapacitorPlugin(name = "WhatsAppChooser")
public class WhatsAppChooserPlugin extends Plugin {
    private static final String TAG = "WhatsAppChooser";
    private static final String WHATSAPP_PACKAGE = "com.whatsapp";
    private static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    @PluginMethod
    public void openChooser(PluginCall call) {
        Log.d(TAG, "openChooser invoked");
        String phoneNumber = call.getString("phoneNumber");
        
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        // Clean phone number - keep only digits
        final String cleanNumber = phoneNumber.replaceAll("[^0-9]", "");
        Log.d(TAG, "=== WhatsApp Chooser Debug ===");
        Log.d(TAG, "Phone number: " + cleanNumber);

        getActivity().runOnUiThread(() -> {
            try {
                PackageManager pm = getActivity().getPackageManager();
                
                boolean hasWhatsApp = isPackageInstalled(WHATSAPP_PACKAGE, pm);
                boolean hasWhatsAppBusiness = isPackageInstalled(WHATSAPP_BUSINESS_PACKAGE, pm);
                
                Log.d(TAG, "Package check results:");
                Log.d(TAG, "  - com.whatsapp: " + hasWhatsApp);
                Log.d(TAG, "  - com.whatsapp.w4b: " + hasWhatsAppBusiness);

                if (!hasWhatsApp && !hasWhatsAppBusiness) {
                    Log.w(TAG, "No WhatsApp apps installed!");
                    call.reject("No WhatsApp app installed");
                    return;
                }

                // If only one app, open directly
                if (hasWhatsApp && !hasWhatsAppBusiness) {
                    Log.d(TAG, "Decision: Only WhatsApp installed -> opening directly");
                    openWhatsAppIntent(cleanNumber, WHATSAPP_PACKAGE);
                    call.resolve();
                    return;
                }
                
                if (!hasWhatsApp && hasWhatsAppBusiness) {
                    Log.d(TAG, "Decision: Only WhatsApp Business installed -> opening directly");
                    openWhatsAppIntent(cleanNumber, WHATSAPP_BUSINESS_PACKAGE);
                    call.resolve();
                    return;
                }

                // Both apps installed - show custom bottom sheet chooser
                Log.d(TAG, "Decision: BOTH apps installed -> showing bottom sheet chooser");
                showBottomSheetChooser(cleanNumber, pm);
                call.resolve();

            } catch (Exception e) {
                Log.e(TAG, "Error opening WhatsApp: " + e.getMessage(), e);
                call.reject("Failed to open WhatsApp: " + e.getMessage());
            }
        });
    }

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "WhatsApp plugin loaded and registered");
    }

    @PluginMethod
    public void ping(PluginCall call) {
        Log.d(TAG, "ping invoked");
        call.resolve();
    }
    
    private void showBottomSheetChooser(String phoneNumber, PackageManager pm) {
        Log.d(TAG, "showBottomSheetChooser called");
        
        BottomSheetDialog bottomSheetDialog = new BottomSheetDialog(getActivity());
        
        // Create layout programmatically
        LinearLayout layout = new LinearLayout(getActivity());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(0, 48, 0, 48);
        
        // Title
        TextView title = new TextView(getActivity());
        title.setText("Open with");
        title.setTextSize(18);
        title.setPadding(48, 24, 48, 24);
        layout.addView(title);
        
        // WhatsApp option
        LinearLayout waOption = createAppOption(pm, WHATSAPP_PACKAGE, "WhatsApp", () -> {
            bottomSheetDialog.dismiss();
            openWhatsAppIntent(phoneNumber, WHATSAPP_PACKAGE);
        });
        if (waOption != null) {
            layout.addView(waOption);
        }
        
        // WhatsApp Business option
        LinearLayout wabOption = createAppOption(pm, WHATSAPP_BUSINESS_PACKAGE, "WhatsApp Business", () -> {
            bottomSheetDialog.dismiss();
            openWhatsAppIntent(phoneNumber, WHATSAPP_BUSINESS_PACKAGE);
        });
        if (wabOption != null) {
            layout.addView(wabOption);
        }
        
        bottomSheetDialog.setContentView(layout);
        bottomSheetDialog.show();
        Log.d(TAG, "Bottom sheet dialog shown");
    }
    
    private LinearLayout createAppOption(PackageManager pm, String packageName, String appName, Runnable onClick) {
        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            Drawable icon = pm.getApplicationIcon(appInfo);
            
            LinearLayout optionLayout = new LinearLayout(getActivity());
            optionLayout.setOrientation(LinearLayout.HORIZONTAL);
            optionLayout.setPadding(48, 32, 48, 32);
            optionLayout.setClickable(true);
            optionLayout.setFocusable(true);
            
            // Set ripple effect background
            int[] attrs = new int[]{android.R.attr.selectableItemBackground};
            android.content.res.TypedArray ta = getActivity().obtainStyledAttributes(attrs);
            Drawable ripple = ta.getDrawable(0);
            ta.recycle();
            optionLayout.setBackground(ripple);
            
            // App icon
            ImageView iconView = new ImageView(getActivity());
            int iconSize = (int) (48 * getActivity().getResources().getDisplayMetrics().density);
            LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(iconSize, iconSize);
            iconView.setLayoutParams(iconParams);
            iconView.setImageDrawable(icon);
            optionLayout.addView(iconView);
            
            // App name
            TextView nameView = new TextView(getActivity());
            nameView.setText(appName);
            nameView.setTextSize(16);
            LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, 
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            textParams.setMargins(32, 0, 0, 0);
            textParams.gravity = android.view.Gravity.CENTER_VERTICAL;
            nameView.setLayoutParams(textParams);
            optionLayout.addView(nameView);
            
            optionLayout.setOnClickListener(v -> onClick.run());
            
            return optionLayout;
        } catch (PackageManager.NameNotFoundException e) {
            Log.w(TAG, "Package not found: " + packageName);
            return null;
        }
    }
    
    private void openWhatsAppIntent(String phoneNumber, String packageName) {
        Log.d(TAG, "Opening WhatsApp intent for package: " + packageName);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("https://api.whatsapp.com/send?phone=" + phoneNumber));
        intent.setPackage(packageName);
        getActivity().startActivity(intent);
    }

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String type = call.getString("type", "normal"); // "normal" or "business"
        
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("Phone number is required");
            return;
        }

        final String cleanNumber = phoneNumber.replaceAll("[^0-9]", "");
        final String packageName = "business".equals(type) ? WHATSAPP_BUSINESS_PACKAGE : WHATSAPP_PACKAGE;
        
        Log.d(TAG, "Opening " + type + " WhatsApp for number: " + cleanNumber);

        getActivity().runOnUiThread(() -> {
            try {
                PackageManager pm = getActivity().getPackageManager();
                
                if (!isPackageInstalled(packageName, pm)) {
                    call.reject(type + " WhatsApp is not installed");
                    return;
                }

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse("https://api.whatsapp.com/send?phone=" + cleanNumber));
                intent.setPackage(packageName);
                getActivity().startActivity(intent);
                call.resolve();

            } catch (Exception e) {
                Log.e(TAG, "Error opening WhatsApp: " + e.getMessage(), e);
                call.reject("Failed to open WhatsApp: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        PackageManager pm = getActivity().getPackageManager();
        
        boolean hasWhatsApp = isPackageInstalled(WHATSAPP_PACKAGE, pm);
        boolean hasWhatsAppBusiness = isPackageInstalled(WHATSAPP_BUSINESS_PACKAGE, pm);
        
        Log.d(TAG, "WhatsApp availability - Normal: " + hasWhatsApp + ", Business: " + hasWhatsAppBusiness);
        
        JSObject result = new JSObject();
        result.put("whatsapp", hasWhatsApp);
        result.put("whatsappBusiness", hasWhatsAppBusiness);
        result.put("anyAvailable", hasWhatsApp || hasWhatsAppBusiness);
        
        call.resolve(result);
    }

    private boolean isPackageInstalled(String packageName, PackageManager pm) {
        try {
            pm.getPackageInfo(packageName, 0);
            Log.d(TAG, "Package " + packageName + " IS installed");
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            Log.d(TAG, "Package " + packageName + " NOT installed");
            return false;
        }
    }
}

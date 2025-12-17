package com.edforce.app.plugins;

import android.app.Dialog;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WhatsAppChooser")
public class WhatsAppChooserPlugin extends Plugin {
    private static final String TAG = "WhatsAppChooser";
    private static final String WHATSAPP_PACKAGE = "com.whatsapp";
    private static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    @PluginMethod
    public void openChooser(PluginCall call) {
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
                Log.d(TAG, "Decision: BOTH apps installed -> showing chooser dialog");
                showCustomChooserDialog(cleanNumber, pm);
                call.resolve();

            } catch (Exception e) {
                Log.e(TAG, "Error opening WhatsApp: " + e.getMessage(), e);
                call.reject("Failed to open WhatsApp: " + e.getMessage());
            }
        });
    }
    
    private void showCustomChooserDialog(String phoneNumber, PackageManager pm) {
        Log.d(TAG, "showCustomChooserDialog called");
        Dialog dialog = new Dialog(getActivity());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        
        // Create main container
        LinearLayout container = new LinearLayout(getActivity());
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackgroundColor(Color.WHITE);
        int padding = dpToPx(20);
        container.setPadding(padding, padding, padding, padding);
        
        // Title
        TextView title = new TextView(getActivity());
        title.setText("Open with");
        title.setTextSize(18);
        title.setTextColor(Color.parseColor("#333333"));
        title.setPadding(0, 0, 0, dpToPx(16));
        container.addView(title);
        
        // WhatsApp option
        LinearLayout waOption = createAppOption(
            "WhatsApp", 
            WHATSAPP_PACKAGE, 
            pm,
            () -> {
                dialog.dismiss();
                openWhatsAppIntent(phoneNumber, WHATSAPP_PACKAGE);
            }
        );
        container.addView(waOption);
        
        // Divider
        View divider = new View(getActivity());
        divider.setBackgroundColor(Color.parseColor("#E0E0E0"));
        LinearLayout.LayoutParams dividerParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(1));
        dividerParams.setMargins(0, dpToPx(8), 0, dpToPx(8));
        divider.setLayoutParams(dividerParams);
        container.addView(divider);
        
        // WhatsApp Business option
        LinearLayout wabOption = createAppOption(
            "WhatsApp Business", 
            WHATSAPP_BUSINESS_PACKAGE, 
            pm,
            () -> {
                dialog.dismiss();
                openWhatsAppIntent(phoneNumber, WHATSAPP_BUSINESS_PACKAGE);
            }
        );
        container.addView(wabOption);
        
        // Cancel button
        TextView cancel = new TextView(getActivity());
        cancel.setText("Cancel");
        cancel.setTextSize(16);
        cancel.setTextColor(Color.parseColor("#666666"));
        cancel.setPadding(0, dpToPx(20), 0, dpToPx(4));
        cancel.setGravity(Gravity.CENTER);
        cancel.setOnClickListener(v -> dialog.dismiss());
        container.addView(cancel);
        
        dialog.setContentView(container);
        
        // Style as bottom sheet
        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT);
            window.setGravity(Gravity.BOTTOM);
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            
            // Add rounded corners at top
            container.setBackgroundResource(android.R.drawable.dialog_holo_light_frame);
            container.setBackgroundColor(Color.WHITE);
        }
        
        dialog.setCancelable(true);
        dialog.show();
        Log.d(TAG, "Dialog shown successfully");
    }
    
    private LinearLayout createAppOption(String appName, String packageName, PackageManager pm, Runnable onClick) {
        LinearLayout option = new LinearLayout(getActivity());
        option.setOrientation(LinearLayout.HORIZONTAL);
        option.setGravity(Gravity.CENTER_VERTICAL);
        option.setPadding(dpToPx(8), dpToPx(12), dpToPx(8), dpToPx(12));
        option.setClickable(true);
        option.setFocusable(true);
        
        // Set ripple effect background
        int[] attrs = new int[]{android.R.attr.selectableItemBackground};
        android.content.res.TypedArray ta = getActivity().obtainStyledAttributes(attrs);
        Drawable ripple = ta.getDrawable(0);
        ta.recycle();
        option.setBackground(ripple);
        
        // App icon
        ImageView icon = new ImageView(getActivity());
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dpToPx(48), dpToPx(48));
        iconParams.setMargins(0, 0, dpToPx(16), 0);
        icon.setLayoutParams(iconParams);
        
        try {
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            Drawable appIcon = pm.getApplicationIcon(appInfo);
            icon.setImageDrawable(appIcon);
        } catch (PackageManager.NameNotFoundException e) {
            // Use placeholder
            icon.setBackgroundColor(Color.parseColor("#25D366"));
        }
        option.addView(icon);
        
        // App name
        TextView name = new TextView(getActivity());
        name.setText(appName);
        name.setTextSize(16);
        name.setTextColor(Color.parseColor("#333333"));
        option.addView(name);
        
        option.setOnClickListener(v -> onClick.run());
        
        return option;
    }
    
    private void openWhatsAppIntent(String phoneNumber, String packageName) {
        Log.d(TAG, "Opening WhatsApp intent for package: " + packageName);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("https://api.whatsapp.com/send?phone=" + phoneNumber));
        intent.setPackage(packageName);
        getActivity().startActivity(intent);
    }
    
    private int dpToPx(int dp) {
        float density = getActivity().getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
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

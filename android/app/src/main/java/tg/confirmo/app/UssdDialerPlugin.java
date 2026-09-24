package tg.confirmo.app;

import android.Manifest;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Sends a USSD request via Android's TelephonyManager and returns the operator's response text,
 * without ever leaving the app or opening the native Dialer. This only supports single-shot USSD
 * requests (Android's public API has no way to continue an interactive multi-step session), which
 * is why the full request string — including the secret PIN — must be composed before calling
 * this. The PIN passes through this call only; it is never persisted or logged here or anywhere
 * else in the app.
 */
@CapacitorPlugin(
    name = "UssdDialer",
    permissions = { @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "call") }
)
public class UssdDialerPlugin extends Plugin {

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O);
        call.resolve(result);
    }

    @PluginMethod
    public void sendUssd(PluginCall call) {
        String code = call.getString("code");
        if (code == null || code.isEmpty()) {
            call.reject("Code USSD manquant");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("UNSUPPORTED_OS_VERSION");
            return;
        }
        if (getPermissionState("call") != PermissionState.GRANTED) {
            saveCall(call);
            requestPermissionForAlias("call", call, "ussdPermsCallback");
            return;
        }
        executeUssd(call, code);
    }

    @PermissionCallback
    private void ussdPermsCallback(PluginCall call) {
        if (getPermissionState("call") == PermissionState.GRANTED) {
            executeUssd(call, call.getString("code"));
        } else {
            call.reject("PERMISSION_DENIED");
        }
    }

    private void executeUssd(PluginCall call, String code) {
        TelephonyManager telephonyManager = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
        if (telephonyManager == null) {
            call.reject("Service téléphonie indisponible");
            return;
        }
        try {
            telephonyManager.sendUssdRequest(
                code,
                new TelephonyManager.UssdResponseCallback() {
                    @Override
                    public void onReceiveUssdResponse(TelephonyManager tm, String request, CharSequence response) {
                        JSObject result = new JSObject();
                        result.put("response", response.toString());
                        call.resolve(result);
                    }

                    @Override
                    public void onReceiveUssdResponseFailed(TelephonyManager tm, String request, int failureCode) {
                        JSObject result = new JSObject();
                        result.put("failureCode", failureCode);
                        call.reject("USSD_FAILED", null, result);
                    }
                },
                new Handler(Looper.getMainLooper())
            );
        } catch (SecurityException e) {
            call.reject("PERMISSION_DENIED");
        }
    }
}

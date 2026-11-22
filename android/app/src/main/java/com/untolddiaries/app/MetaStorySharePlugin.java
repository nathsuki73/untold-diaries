package com.untolddiaries.app;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * Local plugin that only hands off to the official Meta Sharing to Stories
 * intents. It never reports publish success: a resolved result means only that
 * the official app was launched.
 *
 * The sticker/background images (including any link/song text) are generated
 * on the web side; this plugin merely writes the supplied PNG bytes to a
 * cache file and passes a content URI to the target app.
 */
@CapacitorPlugin(name = "MetaStoryShare")
public class MetaStorySharePlugin extends Plugin {

    private static final String PLATFORM_INSTAGRAM = "instagram";
    private static final String PLATFORM_FACEBOOK = "facebook";

    private static final String INSTAGRAM_PACKAGE = "com.instagram.android";
    private static final String FACEBOOK_PACKAGE = "com.facebook.katana";

    private static final String INSTAGRAM_STORY_ACTION = "com.instagram.share.ADD_TO_STORY";
    private static final String FACEBOOK_STORY_ACTION = "com.facebook.stories.ADD_TO_STORY";

    private static final String INSTAGRAM_APP_ID_EXTRA = "source_application";
    private static final String FACEBOOK_APP_ID_EXTRA = "com.facebook.platform.extra.APPLICATION_ID";
    private static final String STICKER_ASSET_EXTRA = "interactive_asset_uri";

    private static final String PNG_MIME_TYPE = "image/png";
    private static final String FILE_PROVIDER_SUFFIX = ".fileprovider";

    private static final String APP_ID_REASON =
        "Meta sharing is not configured. Add a public Facebook App ID to "
        + "android/app/src/main/res/values/facebook_app_id.xml and rebuild. "
        + "Never add an App Secret.";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        String requestedPlatform = call.getString("platform");
        if (requestedPlatform != null && !requestedPlatform.isEmpty() && !isKnownPlatform(requestedPlatform)) {
            call.reject("Unsupported platform: " + requestedPlatform);
            return;
        }

        JSObject result = new JSObject();

        // Both official flows require the same public Meta app ID.
        if (getConfiguredAppId() == null) {
            result.put("available", false);
            result.put("installed", false);
            result.put("reason", APP_ID_REASON);
            call.resolve(result);
            return;
        }

        if (requestedPlatform != null && !requestedPlatform.isEmpty()) {
            boolean installed = canHandleStoryIntent(requestedPlatform);
            result.put("available", installed);
            result.put("installed", installed);
            if (!installed) {
                result.put("reason", missingAppReason(requestedPlatform));
            }
            call.resolve(result);
            return;
        }

        boolean instagramInstalled = canHandleStoryIntent(PLATFORM_INSTAGRAM);
        boolean facebookInstalled = canHandleStoryIntent(PLATFORM_FACEBOOK);
        boolean anyInstalled = instagramInstalled || facebookInstalled;

        result.put("available", anyInstalled);
        result.put("installed", anyInstalled);

        String reason = null;
        if (!instagramInstalled && !facebookInstalled) {
            reason = "Neither Instagram nor Facebook is installed with story sharing support.";
        } else if (!instagramInstalled) {
            reason = "Instagram is not installed with story sharing support. Facebook is available.";
        } else if (!facebookInstalled) {
            reason = "Facebook is not installed with story sharing support. Instagram is available.";
        }
        if (reason != null) {
            result.put("reason", reason);
        }

        call.resolve(result);
    }

    @PluginMethod
    public void shareToInstagramStory(PluginCall call) {
        shareToStory(call, PLATFORM_INSTAGRAM);
    }

    @PluginMethod
    public void shareToFacebookStory(PluginCall call) {
        shareToStory(call, PLATFORM_FACEBOOK);
    }

    @PluginMethod
    public void copyToClipboard(PluginCall call) {
        String value = call.getString("value");
        if (value == null || value.isEmpty()) {
            call.reject("Missing value to copy");
            return;
        }

        ClipboardManager clipboard =
            (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) {
            call.reject("Clipboard is unavailable on this device");
            return;
        }

        clipboard.setPrimaryClip(ClipData.newPlainText("untold-diaries-story-link", value));

        JSObject result = new JSObject();
        result.put("copied", true);
        call.resolve(result);
    }

    private void shareToStory(PluginCall call, String platform) {
        try {
            String appId = getConfiguredAppId();
            if (appId == null) {
                call.reject(APP_ID_REASON);
                return;
            }

            String backgroundBase64 = call.getString("backgroundBase64");
            if (backgroundBase64 == null || backgroundBase64.isEmpty()) {
                call.reject("Missing Story background image");
                return;
            }

            String targetPackage = packageFor(platform);
            Intent intent = new Intent(actionFor(platform));
            intent.setPackage(targetPackage);
            intent.putExtra(appIdExtraFor(platform), appId);

            Uri backgroundUri = writePngToCache(backgroundBase64, "metastoryshare_bg");
            intent.setDataAndType(backgroundUri, PNG_MIME_TYPE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            grantReadAccess(targetPackage, backgroundUri);

            // The sticker is generated on the web; destinationUrl, stickerLabel
            // and song metadata are not sent as story extras.
            String stickerBase64 = call.getString("stickerBase64");
            if (stickerBase64 != null && !stickerBase64.isEmpty()) {
                Uri stickerUri = writePngToCache(stickerBase64, "metastoryshare_sticker");
                intent.putExtra(STICKER_ASSET_EXTRA, stickerUri);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                grantReadAccess(targetPackage, stickerUri);
            }

            if (intent.resolveActivity(bridge.activity.getPackageManager()) == null) {
                call.reject(missingAppReason(platform));
                return;
            }

            bridge.activity.startActivity(intent);

            JSObject result = new JSObject();
            result.put("handoff", true);
            result.put("platform", platform);
            call.resolve(result);
        } catch (Exception ex) {
            Logger.error(getLogTag(), "Unable to hand off to " + platform + " Story", ex);
            call.reject("Unable to hand off to " + displayName(platform)
                + " Story: " + (ex.getMessage() == null ? "unknown error" : ex.getMessage()));
        }
    }

    private boolean canHandleStoryIntent(String platform) {
        Intent probe = new Intent(actionFor(platform));
        probe.setPackage(packageFor(platform));
        probe.setType(PNG_MIME_TYPE);
        return probe.resolveActivity(bridge.activity.getPackageManager()) != null;
    }

    private void grantReadAccess(String targetPackage, Uri uri) {
        bridge.activity.grantUriPermission(
            targetPackage, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
    }

    private Uri writePngToCache(String base64, String prefix) throws IOException {
        String payload = base64;
        if (payload.startsWith("data:")) {
            int comma = payload.indexOf(',');
            if (comma >= 0) {
                payload = payload.substring(comma + 1);
            }
        }

        byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
        if (bytes.length == 0) {
            throw new IOException("Empty image data");
        }

        File file = File.createTempFile(prefix + "_", ".png", bridge.activity.getCacheDir());
        try (FileOutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        } catch (IOException ex) {
            if (!file.delete()) {
                file.deleteOnExit();
            }
            throw ex;
        }

        return FileProvider.getUriForFile(
            bridge.activity,
            bridge.activity.getPackageName() + FILE_PROVIDER_SUFFIX,
            file
        );
    }

    private String getConfiguredAppId() {
        String appId = getContext().getString(R.string.facebook_app_id).trim();
        // The generated placeholder and non-numeric values are not usable App IDs.
        if (appId.isEmpty() || "YOUR_APP_ID".equals(appId)
            || "0".equals(appId) || !appId.matches("[0-9]+")) {
            return null;
        }
        return appId;
    }

    private static boolean isKnownPlatform(String platform) {
        return PLATFORM_INSTAGRAM.equals(platform) || PLATFORM_FACEBOOK.equals(platform);
    }

    private static String actionFor(String platform) {
        return PLATFORM_INSTAGRAM.equals(platform)
            ? INSTAGRAM_STORY_ACTION
            : FACEBOOK_STORY_ACTION;
    }

    private static String packageFor(String platform) {
        return PLATFORM_INSTAGRAM.equals(platform)
            ? INSTAGRAM_PACKAGE
            : FACEBOOK_PACKAGE;
    }

    private static String appIdExtraFor(String platform) {
        return PLATFORM_INSTAGRAM.equals(platform)
            ? INSTAGRAM_APP_ID_EXTRA
            : FACEBOOK_APP_ID_EXTRA;
    }

    private static String displayName(String platform) {
        return PLATFORM_INSTAGRAM.equals(platform) ? "Instagram" : "Facebook";
    }

    private static String missingAppReason(String platform) {
        return displayName(platform)
            + " is not installed or does not support "
            + actionFor(platform)
            + ".";
    }
}

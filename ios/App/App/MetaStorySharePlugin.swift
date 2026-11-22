import Foundation
import UIKit
import Capacitor

/// Local Capacitor plugin that implements Meta's official "Share to Stories" handoff.
///
/// Scope (intentional):
/// - Only the documented iOS pasteboard + custom URL-scheme handoff is implemented.
/// - `handoff: true` means the OS accepted opening the target app. It does **not**
///   mean a story was published.
/// - Link stickers, music stickers, contentURL/attributionURL and publish/cancel
///   callbacks are deliberately not implemented. `destinationUrl`, `stickerLabel`,
///   `songTitle` and `songArtist` are accepted from the bridge but ignored: the web
///   layer renders the sticker image and owns the clipboard fallback.
@objc(MetaStorySharePlugin)
public class MetaStorySharePlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "MetaStorySharePlugin"

    /// Must match `registerPlugin<MetaStorySharePlugin>("MetaStoryShare")` in the JS bridge.
    public let jsName = "MetaStoryShare"

    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareToInstagramStory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareToFacebookStory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyToClipboard", returnType: CAPPluginReturnPromise)
    ]

    private enum Platform: String {
        case instagram
        case facebook

        var displayName: String {
            switch self {
            case .instagram: return "Instagram"
            case .facebook: return "Facebook"
            }
        }

        var urlScheme: String {
            switch self {
            case .instagram: return "instagram-stories://share"
            case .facebook: return "facebook-stories://share"
            }
        }

        var canOpenProbe: String {
            switch self {
            case .instagram: return "instagram-stories://"
            case .facebook: return "facebook-stories://"
            }
        }
    }

    private enum PasteboardKey {
        static let backgroundImage = "backgroundImage"
        static let stickerImage = "stickerImage"
        static let backgroundTopColor = "backgroundTopColor"
        static let backgroundBottomColor = "backgroundBottomColor"

        static func instagram(_ suffix: String) -> String {
            return "com.instagram.sharedSticker.\(suffix)"
        }

        static func facebook(_ suffix: String) -> String {
            return "com.facebook.sharedSticker.\(suffix)"
        }
    }

    private enum Config {
        /// Meta's pasteboard payload lifetime. Do not shorten without updating the docs.
        static let pasteboardExpirationInterval: TimeInterval = 300
        static let configPlistName = "FacebookConfig"
        static let configAppIDKey = "FacebookAppID"
        static let placeholderAppID = "YOUR_APP_ID"

        /// Neutral defaults; the web-rendered background/sticker images carry the design.
        static let backgroundTopColor = "#FFFFFF"
        static let backgroundBottomColor = "#000000"
    }

    // MARK: - Availability

    @objc public func isAvailable(_ call: CAPPluginCall) {
        let requested = call.getString("platform")

        if requested == "instagram" {
            call.resolve(availability(for: .instagram))
            return
        }
        if requested == "facebook" {
            call.resolve(availability(for: .facebook))
            return
        }

        // The JS bridge currently calls isAvailable() with no platform filter.
        // Report overall availability across both supported destinations.
        let instagram = availability(for: .instagram)
        let facebook = availability(for: .facebook)
        let available = bool(instagram, forKey: "available") || bool(facebook, forKey: "available")
        let installed = bool(instagram, forKey: "installed") || bool(facebook, forKey: "installed")

        var reasons: [String] = []
        reasons.append(contentsOf: reasonStrings(instagram, facebook))
        call.resolve(overallAvailability(available: available, installed: installed, reasons: reasons))
    }

    private func availability(for platform: Platform) -> [String: Any] {
        if facebookAppID() == nil {
            return result(
                available: false,
                installed: false,
                reason: "Meta sharing is not configured. Add a real public Facebook App ID to FacebookConfig.plist (and Info.plist) before building."
            )
        }

        guard let probeURL = URL(string: platform.canOpenProbe) else {
            return result(
                available: false,
                installed: false,
                reason: "Invalid \(platform.displayName) Stories URL scheme."
            )
        }

        let installed = UIApplication.shared.canOpenURL(probeURL)
        return result(
            available: installed,
            installed: installed,
            reason: installed ? nil : "\(platform.displayName) is not installed or does not support Stories sharing."
        )
    }

    private func overallAvailability(available: Bool, installed: Bool, reasons: [String]) -> [String: Any] {
        return result(available: available, installed: installed, reason: reasons.isEmpty ? nil : reasons.joined(separator: " "))
    }

    // MARK: - Story handoff

    @objc public func shareToInstagramStory(_ call: CAPPluginCall) {
        handoff(to: .instagram, call: call)
    }

    @objc public func shareToFacebookStory(_ call: CAPPluginCall) {
        handoff(to: .facebook, call: call)
    }

    private func handoff(to platform: Platform, call: CAPPluginCall) {
        // Accepted but intentionally unused: destinationUrl, stickerLabel,
        // songTitle, songArtist. Meta's pasteboard API has no official keys for
        // automatic link or music stickers, so the web layer renders the sticker
        // image and handles the link via copyToClipboard.
        guard let backgroundBase64 = call.getString("backgroundBase64"),
              let backgroundData = decodedImageData(from: backgroundBase64) else {
            call.reject("Missing or invalid Story background image")
            return
        }

        guard let appID = facebookAppID() else {
            call.resolve(handoffResult(handoff: false, platform: platform,
                                       reason: "Meta sharing is not configured in FacebookConfig.plist."))
            return
        }

        guard let schemeURL = shareURL(for: platform, appID: appID),
              UIApplication.shared.canOpenURL(schemeURL) else {
            call.resolve(handoffResult(handoff: false, platform: platform,
                                       reason: "\(platform.displayName) is not installed or cannot open Story share URLs."))
            return
        }

        var items: [String: Any] = pasteboardItems(
            for: platform,
            backgroundData: backgroundData,
            stickerData: decodedImageData(from: call.getString("stickerBase64"))
        )
        if platform == .facebook {
            items[PasteboardKey.facebook("appID")] = appID
        }

        // Meta requires the pasteboard payload to be set before opening the app.
        UIPasteboard.general.setItems([items], options: [
            .expirationInterval: Config.pasteboardExpirationInterval
        ])

        UIApplication.shared.open(schemeURL, options: [:]) { accepted in
            DispatchQueue.main.async {
                call.resolve(self.handoffResult(handoff: accepted, platform: platform,
                                                reason: accepted ? nil : "The OS did not accept the \(platform.displayName) Stories handoff."))
            }
        }
    }

    /// Instagram requires the public App ID in `source_application`; Facebook
    /// carries it in the pasteboard instead.
    private func shareURL(for platform: Platform, appID: String) -> URL? {
        guard var components = URLComponents(string: platform.urlScheme) else {
            return nil
        }
        if platform == .instagram {
            components.queryItems = [URLQueryItem(name: "source_application", value: appID)]
        }
        return components.url
    }

    private func pasteboardItems(for platform: Platform, backgroundData: Data, stickerData: Data?) -> [String: Any] {
        let prefix: (String) -> String
        switch platform {
        case .instagram: prefix = PasteboardKey.instagram
        case .facebook: prefix = PasteboardKey.facebook
        }

        var items: [String: Any] = [
            prefix(PasteboardKey.backgroundImage): backgroundData,
            prefix(PasteboardKey.backgroundTopColor): Config.backgroundTopColor,
            prefix(PasteboardKey.backgroundBottomColor): Config.backgroundBottomColor
        ]
        if let stickerData = stickerData {
            items[prefix(PasteboardKey.stickerImage)] = stickerData
        }
        return items
    }

    // MARK: - Clipboard

    @objc public func copyToClipboard(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), !value.isEmpty else {
            call.reject("Missing value to copy")
            return
        }
        UIPasteboard.general.string = value
        call.resolve(["copied": true])
    }

    // MARK: - Helpers

    /// Public Facebook App ID only. No App Secret is read or stored anywhere.
    private func facebookAppID() -> String? {
        guard let url = Bundle.main.url(forResource: Config.configPlistName, withExtension: "plist"),
              let plist = NSDictionary(contentsOf: url),
              let raw = plist[Config.configAppIDKey] as? String else {
            return nil
        }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed != Config.placeholderAppID else {
            return nil
        }
        return trimmed
    }

    /// Accepts raw base64 and data-URL encoded images.
    private func decodedImageData(from value: String?) -> Data? {
        guard let value = value, !value.isEmpty else { return nil }
        var encoded = value
        if encoded.lowercased().hasPrefix("data:"), let comma = encoded.firstIndex(of: ",") {
            encoded = String(encoded[encoded.index(after: comma)...])
        }
        return Data(base64Encoded: encoded)
    }

    private func result(available: Bool, installed: Bool, reason: String?) -> [String: Any] {
        var value: [String: Any] = ["available": available, "installed": installed]
        if let reason = reason { value["reason"] = reason }
        return value
    }

    private func handoffResult(handoff: Bool, platform: Platform, reason: String?) -> [String: Any] {
        var value: [String: Any] = ["handoff": handoff, "platform": platform.rawValue]
        if let reason = reason { value["reason"] = reason }
        return value
    }

    private func bool(_ dictionary: [String: Any], forKey key: String) -> Bool {
        return dictionary[key] as? Bool ?? false
    }

    private func reasonStrings(_ dictionaries: [String: Any]...) -> [String] {
        return dictionaries.compactMap { $0["reason"] as? String }
    }
}

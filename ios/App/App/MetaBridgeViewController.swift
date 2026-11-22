import UIKit
import Capacitor

/// Registers the local Meta Story plugin at Capacitor's documented hook.
final class MetaBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(MetaStorySharePlugin())
    }
}

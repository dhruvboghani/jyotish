import UIKit
import Capacitor

/// Capacitor's view controller plus the app's own plugin and the iOS swipe-back gesture.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(GvNativePlugin())
        webView?.allowsBackForwardNavigationGestures = true
    }
}

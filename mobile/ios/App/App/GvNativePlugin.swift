import Foundation
import UIKit
import WebKit
import Capacitor
import AVFoundation
import WidgetKit

/// Native helpers used by mobile/src/app-bridge.js (window.Capacitor.Plugins.GvNative) — iOS side.
@objc(GvNativePlugin)
public class GvNativePlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "GvNativePlugin"
    public let jsName = "GvNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pushAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openExternal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeaking", returnType: CAPPluginReturnPromise)
    ]

    /// Renders the page (print stylesheet) into a paginated A4 PDF and opens the share sheet
    /// (Save to Files, WhatsApp, Mail, Print…). Resolves { done: true } once the PDF is made.
    @objc func print(_ call: CAPPluginCall) {
        let name = (call.getString("name") ?? "Grahavani").replacingOccurrences(of: "/", with: "-")
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let webView = self.bridge?.webView, let vc = self.bridge?.viewController else {
                call.reject("No web view"); return
            }
            let renderer = UIPrintPageRenderer()
            renderer.addPrintFormatter(webView.viewPrintFormatter(), startingAtPageAt: 0)
            let page = CGRect(x: 0, y: 0, width: 595.2, height: 841.8) // A4 in points
            let margin: CGFloat = 28
            renderer.setValue(NSValue(cgRect: page), forKey: "paperRect")
            renderer.setValue(NSValue(cgRect: page.insetBy(dx: margin, dy: margin)), forKey: "printableRect")
            let data = NSMutableData()
            UIGraphicsBeginPDFContextToData(data, page, nil)
            for i in 0..<max(renderer.numberOfPages, 1) {
                UIGraphicsBeginPDFPage()
                renderer.drawPage(at: i, in: UIGraphicsGetPDFContextBounds())
            }
            UIGraphicsEndPDFContext()
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(name + ".pdf")
            do { try data.write(to: url, options: .atomic) } catch { call.reject("Could not save the PDF"); return }
            call.resolve(["done": true])
            let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let pop = share.popoverPresentationController { // iPad
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 1, height: 1)
                pop.permittedArrowDirections = []
            }
            vc.present(share, animated: true)
        }
    }

    /// Keeps the widget data (8 days of Panchang) for a future iOS widget; shared App Group when configured.
    @objc func saveWidget(_ call: CAPPluginCall) {
        guard let data = call.getString("data") else { call.reject("data required"); return }
        let defaults = UserDefaults(suiteName: "group.com.grahavani.app") ?? UserDefaults.standard
        defaults.set(data, forKey: "gv_widget")
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() } // home and lock-screen widgets
        call.resolve()
    }

    /// iOS push uses Apple's service directly (APNs), so it is always available once notifications are allowed.
    @objc func pushAvailable(_ call: CAPPluginCall) {
        call.resolve(["value": true, "service": "apns"])
    }

    @objc func openExternal(_ call: CAPPluginCall) {
        guard let s = call.getString("url"), let url = URL(string: s) else { call.reject("url required"); return }
        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { ok in ok ? call.resolve() : call.reject("No app can open this link") }
        }
    }

    // MARK: Read aloud (Rashifal) with the system voices
    private lazy var synth: AVSpeechSynthesizer = { let s = AVSpeechSynthesizer(); s.delegate = self; return s }()
    private var speakCall: CAPPluginCall?
    private var hasVoice = true

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? "", lang = call.getString("lang") ?? "en-IN"
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.finishSpeaking(ok: true)
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            let voice = AVSpeechSynthesisVoice(language: lang) ?? AVSpeechSynthesisVoice.speechVoices().first { $0.language.hasPrefix(String(lang.prefix(2))) }
            self.hasVoice = voice != nil
            let u = AVSpeechUtterance(string: text)
            u.voice = voice ?? AVSpeechSynthesisVoice(language: "en-IN")
            u.rate = AVSpeechUtteranceDefaultSpeechRate * 0.95
            self.speakCall = call
            self.synth.speak(u)
        }
    }
    @objc func stopSpeaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.synth.stopSpeaking(at: .immediate)
            self?.finishSpeaking(ok: true)
            call.resolve()
        }
    }
    private func finishSpeaking(ok: Bool) {
        guard let c = speakCall else { return }
        speakCall = nil
        c.resolve(["ok": ok && hasVoice])
    }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { finishSpeaking(ok: true) }
    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { finishSpeaking(ok: true) }
}

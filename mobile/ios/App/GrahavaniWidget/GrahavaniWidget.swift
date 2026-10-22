import WidgetKit
import SwiftUI

/// Grahavani widgets for the iPhone home screen and lock screen.
/// The app writes 8 days of ready-to-show Panchang text (in the user's language) into the shared App Group
/// (GvNativePlugin.saveWidget); each day also carries its 24 hora start times, so the widget can show the
/// planetary hour running now without opening the app.

struct GvDay: Decodable {
    let date: String
    let title: String
    let tithi: String
    let nak: String
    let sun: String
    let rahu: String
    let stars: Int?
    let tithiShort: String?
    let horas: [[GvAny]]?
}
struct GvData: Decodable { let brand: String; let place: String; let your: String?; let open: String?; let days: [GvDay] }
/// Hora rows are [startMs, label, quality] — mixed types
enum GvAny: Decodable {
    case n(Double), s(String)
    init(from d: Decoder) throws {
        let c = try d.singleValueContainer()
        if let v = try? c.decode(Double.self) { self = .n(v) } else { self = .s((try? c.decode(String.self)) ?? "") }
    }
    var num: Double { if case .n(let v) = self { return v }; return 0 }
    var str: String { if case .s(let v) = self { return v }; return "" }
}

struct GvEntry: TimelineEntry {
    let date: Date
    let brand: String
    let place: String
    let title: String
    let tithi: String
    let nak: String
    let sun: String
    let rahu: String
    let hora: String
    let stars: Int
    let empty: Bool
}

func gvLoad() -> GvData? {
    let defaults = UserDefaults(suiteName: "group.com.grahavani.app")
    guard let raw = defaults?.string(forKey: "gv_widget"), let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(GvData.self, from: data)
}
func gvDayKey(_ d: Date) -> String { let f = DateFormatter(); f.calendar = Calendar(identifier: .gregorian); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; return f.string(from: d) }

func gvEntry(at date: Date, data: GvData?) -> GvEntry {
    guard let data = data, let day = data.days.first(where: { $0.date == gvDayKey(date) }) else {
        return GvEntry(date: date, brand: "Grahavani", place: "", title: "Grahavani", tithi: data?.open ?? "Open Grahavani to load today's Panchang.", nak: "", sun: "", rahu: "", hora: "", stars: 0, empty: true)
    }
    let ms = date.timeIntervalSince1970 * 1000
    var hora = ""
    for d in data.days { for h in d.horas ?? [] where h.count >= 2 && h[0].num <= ms { hora = h[1].str } }
    return GvEntry(date: date, brand: data.brand, place: data.place, title: day.title, tithi: day.tithiShort ?? day.tithi, nak: day.nak, sun: day.sun, rahu: day.rahu, hora: hora, stars: day.stars ?? 0, empty: false)
}

struct GvProvider: TimelineProvider {
    func placeholder(in context: Context) -> GvEntry {
        GvEntry(date: Date(), brand: "Grahavani", place: "New Delhi", title: "Thursday, 22 Oct", tithi: "Shukla Ekadashi", nak: "Shatabhisha", sun: "Sunrise 6:29 · Sunset 17:46", rahu: "Rahu Kaal 13:30–14:55", hora: "Jupiter hora", stars: 4, empty: false)
    }
    func getSnapshot(in context: Context, completion: @escaping (GvEntry) -> Void) { completion(gvEntry(at: Date(), data: gvLoad())) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<GvEntry>) -> Void) {
        let data = gvLoad(), now = Date()
        // A new entry at each hora change for the next 24 hours, and at midnight
        var times: [Date] = [now]
        if let data = data {
            for d in data.days { for h in d.horas ?? [] where h.count >= 1 {
                let t = Date(timeIntervalSince1970: h[0].num / 1000)
                if t > now && t < now.addingTimeInterval(86400) { times.append(t) }
            } }
        }
        let midnight = Calendar.current.startOfDay(for: now.addingTimeInterval(86400))
        times.append(midnight)
        let entries = Array(Set(times)).sorted().prefix(40).map { gvEntry(at: $0, data: data) }
        completion(Timeline(entries: entries, policy: .after(min(midnight, now.addingTimeInterval(6 * 3600)))))
    }
}

let gvInk = Color(red: 0.086, green: 0.09, blue: 0.231)
let gvGold = Color(red: 0.549, green: 0.369, blue: 0.02)
let gvIndigo = Color(red: 0.165, green: 0.18, blue: 0.486)

struct GvWidgetView: View {
    @Environment(\.widgetFamily) var family
    let e: GvEntry
    var body: some View {
        switch family {
        case .accessoryInline:
            Text(e.hora.isEmpty ? e.tithi : "\(e.tithi) · \(e.hora)")
        case .accessoryCircular:
            ZStack { AccessoryWidgetBackground(); Text(e.tithi).font(.system(size: 11, weight: .semibold)).multilineTextAlignment(.center).minimumScaleFactor(0.6).padding(2) }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(e.tithi).font(.headline).lineLimit(1)
                if !e.hora.isEmpty { Text(e.hora).font(.caption).lineLimit(1) }
                if !e.rahu.isEmpty { Text(e.rahu).font(.caption2).lineLimit(1) }
            }
        case .systemSmall:
            VStack(alignment: .leading, spacing: 3) {
                Text(e.brand).font(.system(size: 11, weight: .bold)).foregroundColor(gvGold).lineLimit(1)
                Text(e.title).font(.system(size: 12, weight: .semibold)).foregroundColor(gvInk).lineLimit(1)
                Text(e.tithi).font(.system(size: 15, weight: .bold)).foregroundColor(gvIndigo).lineLimit(2)
                Spacer(minLength: 0)
                if !e.hora.isEmpty { Text(e.hora).font(.system(size: 12, weight: .semibold)).foregroundColor(gvGold).lineLimit(1) }
                if !e.nak.isEmpty { Text(e.nak).font(.system(size: 11)).foregroundColor(.secondary).lineLimit(1) }
            }.frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(alignment: .leading, spacing: 3) {
                Text(e.place.isEmpty ? e.brand : "\(e.brand) · \(e.place)").font(.system(size: 11, weight: .bold)).foregroundColor(gvGold).lineLimit(1)
                Text(e.title).font(.system(size: 15, weight: .bold)).foregroundColor(gvInk).lineLimit(1)
                Text(e.empty ? e.tithi : "\(e.tithi) · \(e.nak)").font(.system(size: 14, weight: .semibold)).foregroundColor(gvIndigo).lineLimit(2)
                if !e.hora.isEmpty { Text(e.hora).font(.system(size: 12, weight: .semibold)).foregroundColor(gvGold).lineLimit(1) }
                if !e.sun.isEmpty { Text(e.sun).font(.system(size: 11)).foregroundColor(.secondary).lineLimit(1) }
                if !e.rahu.isEmpty { Text(e.rahu).font(.system(size: 11)).foregroundColor(Color(red: 0.76, green: 0.21, blue: 0.18)).lineLimit(1) }
                if e.stars > 0 { Text(String(repeating: "★", count: e.stars) + String(repeating: "☆", count: 5 - e.stars)).font(.system(size: 12)).foregroundColor(Color(red: 0.83, green: 0.59, blue: 0.11)) }
            }.frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct GvBackground: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) { content.containerBackground(for: .widget) { Color(red: 1, green: 0.992, blue: 0.969) } }
        else { content.padding().background(Color(red: 1, green: 0.992, blue: 0.969)) }
    }
}

struct GrahavaniWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "GrahavaniPanchang", provider: GvProvider()) { e in
            GvWidgetView(e: e).modifier(GvBackground())
        }
        .configurationDisplayName("Grahavani")
        .description("Today's tithi, nakshatra, the hora running now and Rahu Kaal.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}

@main
struct GrahavaniWidgets: WidgetBundle {
    var body: some Widget { GrahavaniWidget() }
}

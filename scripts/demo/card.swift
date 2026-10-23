// Renders a caption bar or a full title card to a 1920x1080 PNG.
//   card caption <out.png> "<text>"
//   card card    <out.png> "<title>" "<line>" "<line>" ...      (lines starting with "$ " or "> " render monospaced)
import AppKit

let W = 1920, H = 1080
let args = CommandLine.arguments
guard args.count >= 4 else { FileHandle.standardError.write("usage: card <caption|card> out.png text...\n".data(using: .utf8)!); exit(1) }
let mode = args[1], out = args[2]

func color(_ hex: UInt32, _ a: CGFloat = 1) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: a)
}
let ink = color(0xF4F1EA), muted = color(0x9AA3B2), accent = color(0x3D8BFF), bg = color(0x0F1111), panel = color(0x1B1F23)

let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4,
                           hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSColor.clear.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill(using: .copy)

func draw(_ s: String, font: NSFont, color c: NSColor, in rect: NSRect, align: NSTextAlignment = .left) {
  let p = NSMutableParagraphStyle(); p.alignment = align; p.lineBreakMode = .byWordWrapping; p.lineSpacing = 4
  (s as NSString).draw(in: rect, withAttributes: [.font: font, .foregroundColor: c, .paragraphStyle: p])
}
func height(_ s: String, font: NSFont, width: CGFloat) -> CGFloat {
  let p = NSMutableParagraphStyle(); p.lineSpacing = 4
  return ceil((s as NSString).boundingRect(with: NSSize(width: width, height: 2000), options: .usesLineFragmentOrigin,
    attributes: [.font: font, .paragraphStyle: p]).height)
}

if mode == "caption" {
  let font = NSFont.systemFont(ofSize: 38, weight: .semibold)
  let text = args[3]
  let maxW: CGFloat = 1620
  let th = height(text, font: font, width: maxW)
  let barH = th + 36
  let bar = NSRect(x: 96, y: 14, width: CGFloat(W) - 192, height: barH)
  color(0x0F1111, 0.9).setFill()
  NSBezierPath(roundedRect: bar, xRadius: 14, yRadius: 14).fill()
  accent.setFill(); NSRect(x: bar.minX, y: bar.minY, width: 8, height: barH).fill()
  draw(text, font: font, color: ink, in: NSRect(x: bar.minX + 36, y: bar.minY + 18, width: maxW, height: th))
} else {
  bg.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
  let title = args[3]
  let lines = Array(args.dropFirst(4))
  let tf = NSFont.systemFont(ofSize: 76, weight: .bold)
  var y = CGFloat(H) - 190
  let th = height(title, font: tf, width: 1500)
  draw(title, font: tf, color: ink, in: NSRect(x: 210, y: y - th, width: 1500, height: th))
  accent.setFill(); NSRect(x: 210, y: y - th - 28, width: 120, height: 8).fill()
  y -= th + 70
  for l in lines {
    let mono = l.hasPrefix("$ ") || l.hasPrefix("> ")
    let f = mono ? NSFont.monospacedSystemFont(ofSize: 34, weight: .regular) : NSFont.systemFont(ofSize: 46, weight: .regular)
    let h = height(l, font: f, width: 1500)
    if mono {
      panel.setFill(); NSBezierPath(roundedRect: NSRect(x: 190, y: y - h - 14, width: 1540, height: h + 28), xRadius: 8, yRadius: 8).fill()
    }
    draw(l, font: f, color: mono ? ink : muted, in: NSRect(x: 210, y: y - h, width: 1500, height: h))
    y -= h + (mono ? 34 : 22)
  }
}
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))

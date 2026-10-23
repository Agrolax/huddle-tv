// Prints "x y" of the top-left corner of the first non-black content in an image (the VVD window inside its recording).
import AppKit
let img = NSImage(contentsOfFile: CommandLine.arguments[1])!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let w = img.width, h = img.height
let rep = NSBitmapImageRep(cgImage: img)
func lit(_ x: Int, _ y: Int) -> Bool {
  guard let c = rep.colorAt(x: x, y: y) else { return false }
  return max(c.redComponent, c.greenComponent, c.blueComponent) > 0.1
}
var minX = w, minY = h
for y in stride(from: 0, to: h, by: 2) { for x in stride(from: 0, to: w, by: 2) where lit(x, y) { minX = min(minX, x); minY = min(minY, y) } }
print(minX, minY)

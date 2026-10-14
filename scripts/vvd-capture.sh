#!/usr/bin/env bash
# Press remote keys on the Vega Virtual Device and screenshot its screen.
#
#   scripts/vvd-capture.sh <out.png> [KEY_RIGHT KEY_DOWN ...]
#
# The SDK's screenshooter (vega exec vda ... gwsi-tool-screenshooter) only
# works on physical devices, so this captures the VVD window with macOS
# `screencapture` and crops the remote panel off. macOS only.
set -euo pipefail

out="$1"; shift || true
source ~/vega/env >/dev/null 2>&1 || true

serial="${VDA_SERIAL:-$(vega exec vda devices 2>/dev/null | awk 'NR>1 && $2=="device" {print $1; exit}')}"
for key in "$@"; do
  vega exec vda -s "$serial" shell "inputd-cli button_press $key" >/dev/null
  sleep "${KEY_DELAY:-0.6}"
done
sleep "${SETTLE:-0.8}"

read -r window_id window_h < <(swift - <<'SWIFT'
import CoreGraphics
let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as! [[String: Any]]
for w in list where (w[kCGWindowName as String] as? String) == "Vega Virtual Device" {
  let bounds = w[kCGWindowBounds as String] as! [String: Any]
  print(w[kCGWindowNumber as String] as! Int, bounds["Height"] as! Int); break
}
SWIFT
)
[ -n "$window_id" ] || { echo "Vega Virtual Device window not found (is it on screen?)" >&2; exit 1; }

screencapture -x -o -l "$window_id" "$out"
# Window = title bar + 16:9 screen + remote panel. Keep the screen only, at 1920x1080.
swift - "$out" "$window_h" <<'SWIFT'
import AppKit
let path = CommandLine.arguments[1]
let src = NSImage(contentsOfFile: path)!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let scale = CGFloat(src.height) / CGFloat(Double(CommandLine.arguments[2])!)  // px per pt; 28pt title bar
let top = (28 * scale).rounded()
let h = CGFloat(src.height) - top
let w = (h * 16 / 9).rounded()
let cropped = src.cropping(to: CGRect(x: 0, y: top, width: min(w, CGFloat(src.width)), height: h))!
let ctx = CGContext(data: nil, width: 1920, height: 1080, bitsPerComponent: 8, bytesPerRow: 0,
                    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.interpolationQuality = .high
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: 1920, height: 1080))
let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: path))
SWIFT
echo "$out"

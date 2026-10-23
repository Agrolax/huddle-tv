// Prints the payload of every QR code in an image (macOS Vision). Used to read the pairing URL off the TV screenshot.
import Vision
import AppKit
let img = NSImage(contentsOfFile: CommandLine.arguments[1])!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let req = VNDetectBarcodesRequest()
try VNImageRequestHandler(cgImage: img).perform([req])
for r in req.results ?? [] { print(r.payloadStringValue ?? "") }

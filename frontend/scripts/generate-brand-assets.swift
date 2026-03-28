import AppKit
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

struct RGBA {
  let r: UInt8
  let g: UInt8
  let b: UInt8
  let a: UInt8
}

func loadCGImage(from path: String) -> CGImage? {
  guard let url = URL(string: "file://" + path) as CFURL?,
        let source = CGImageSourceCreateWithURL(url, nil) else {
    return nil
  }
  return CGImageSourceCreateImageAtIndex(source, 0, nil)
}

func writePNG(_ image: CGImage, to path: String) throws {
  let url = URL(fileURLWithPath: path) as CFURL
  guard let destination = CGImageDestinationCreateWithURL(
    url,
    UTType.png.identifier as CFString,
    1,
    nil
  ) else {
    throw NSError(domain: "asset-gen", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not create PNG destination"])
  }

  CGImageDestinationAddImage(destination, image, nil)
  if !CGImageDestinationFinalize(destination) {
    throw NSError(domain: "asset-gen", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not finalize PNG destination"])
  }
}

func rgbaPixels(from image: CGImage) -> ([UInt8], Int, Int)? {
  let width = image.width
  let height = image.height
  let bytesPerPixel = 4
  let bytesPerRow = width * bytesPerPixel
  let bitsPerComponent = 8

  var pixels = [UInt8](repeating: 0, count: Int(height * bytesPerRow))
  guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
        let context = CGContext(
          data: &pixels,
          width: width,
          height: height,
          bitsPerComponent: bitsPerComponent,
          bytesPerRow: bytesPerRow,
          space: colorSpace,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
    return nil
  }

  context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  return (pixels, width, height)
}

func imageFromPixels(_ pixels: [UInt8], width: Int, height: Int) -> CGImage? {
  let bytesPerPixel = 4
  let bytesPerRow = width * bytesPerPixel
  let bitsPerComponent = 8

  guard let provider = CGDataProvider(data: Data(pixels) as CFData),
        let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
    return nil
  }

  return CGImage(
    width: width,
    height: height,
    bitsPerComponent: bitsPerComponent,
    bitsPerPixel: bitsPerComponent * bytesPerPixel,
    bytesPerRow: bytesPerRow,
    space: colorSpace,
    bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
    provider: provider,
    decode: nil,
    shouldInterpolate: true,
    intent: .defaultIntent
  )
}

func makeTransparentBackground(image: CGImage, whiteThreshold: UInt8 = 245) -> CGImage? {
  guard let (rawPixels, width, height) = rgbaPixels(from: image) else {
    return nil
  }

  var pixels = rawPixels

  for index in stride(from: 0, to: pixels.count, by: 4) {
    let r = pixels[index]
    let g = pixels[index + 1]
    let b = pixels[index + 2]

    if r >= whiteThreshold, g >= whiteThreshold, b >= whiteThreshold {
      pixels[index + 3] = 0
    }
  }

  return imageFromPixels(pixels, width: width, height: height)
}

func alphaBounds(image: CGImage, alphaThreshold: UInt8 = 8) -> CGRect? {
  guard let (pixels, width, height) = rgbaPixels(from: image) else {
    return nil
  }

  var minX = width
  var minY = height
  var maxX = -1
  var maxY = -1

  for y in 0..<height {
    for x in 0..<width {
      let alpha = pixels[(y * width + x) * 4 + 3]
      if alpha > alphaThreshold {
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
      }
    }
  }

  guard maxX >= minX, maxY >= minY else { return nil }
  return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
}

func crop(image: CGImage, to rect: CGRect) -> CGImage? {
  image.cropping(to: rect)
}

func logoMarkBounds(from bounds: CGRect) -> CGRect {
  let side = min(bounds.height, bounds.width * 0.34)
  return CGRect(x: bounds.minX, y: bounds.minY, width: side, height: bounds.height)
}

func drawCanvas(
  size: CGSize,
  background: NSColor?,
  image: CGImage,
  imageRect: CGRect
) -> CGImage? {
  let width = Int(size.width)
  let height = Int(size.height)
  guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
        let context = CGContext(
          data: nil,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: 0,
          space: colorSpace,
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
    return nil
  }

  context.interpolationQuality = .high

  if let background {
    context.setFillColor(background.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  } else {
    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
  }

  context.draw(image, in: imageRect)
  return context.makeImage()
}

func scaledRect(for image: CGImage, inside canvas: CGSize, maxContentRatio: CGFloat) -> CGRect {
  let maxWidth = canvas.width * maxContentRatio
  let maxHeight = canvas.height * maxContentRatio
  let imageAspect = CGFloat(image.width) / CGFloat(image.height)

  var drawWidth = maxWidth
  var drawHeight = maxWidth / imageAspect

  if drawHeight > maxHeight {
    drawHeight = maxHeight
    drawWidth = maxHeight * imageAspect
  }

  return CGRect(
    x: (canvas.width - drawWidth) / 2,
    y: (canvas.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  )
}

let root = "/Users/banksjaco/SOLVECONNECT/jaco/frontend/assets/images"
let sourcePath = "\(root)/solveconnect-logo.png"
let iconPath = "\(root)/icon.png"
let adaptivePath = "\(root)/adaptive-icon.png"
let faviconPath = "\(root)/favicon.png"
let splashPath = "\(root)/splash-icon.png"

guard let source = loadCGImage(from: sourcePath) else {
  fputs("Unable to load source logo at \(sourcePath)\n", stderr)
  exit(1)
}

guard let transparent = makeTransparentBackground(image: source),
      let bounds = alphaBounds(image: transparent),
      let cropped = crop(image: transparent, to: logoMarkBounds(from: bounds)) else {
  fputs("Unable to derive transparent logo asset\n", stderr)
  exit(1)
}

let iconCanvas = CGSize(width: 1024, height: 1024)
let faviconCanvas = CGSize(width: 64, height: 64)

guard let iconImage = drawCanvas(
  size: iconCanvas,
  background: .white,
  image: cropped,
  imageRect: scaledRect(for: cropped, inside: iconCanvas, maxContentRatio: 0.74)
),
      let adaptiveImage = drawCanvas(
        size: iconCanvas,
        background: nil,
        image: cropped,
        imageRect: scaledRect(for: cropped, inside: iconCanvas, maxContentRatio: 0.70)
      ),
      let splashImage = drawCanvas(
        size: iconCanvas,
        background: .white,
        image: cropped,
        imageRect: scaledRect(for: cropped, inside: iconCanvas, maxContentRatio: 0.52)
      ),
      let faviconImage = drawCanvas(
        size: faviconCanvas,
        background: .white,
        image: cropped,
        imageRect: scaledRect(for: cropped, inside: faviconCanvas, maxContentRatio: 0.82)
      ) else {
  fputs("Unable to render output assets\n", stderr)
  exit(1)
}

do {
  try writePNG(iconImage, to: iconPath)
  try writePNG(adaptiveImage, to: adaptivePath)
  try writePNG(faviconImage, to: faviconPath)
  try writePNG(splashImage, to: splashPath)
  print("Generated branded assets successfully.")
} catch {
  fputs("Failed to write assets: \(error)\n", stderr)
  exit(1)
}

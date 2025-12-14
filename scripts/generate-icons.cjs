// Simple icon generator script
// Creates a minimal ICO file for development

const fs = require('fs');
const path = require('path');

// Create a simple 32x32 ICO header and image data
// ICO format: Header (6 bytes) + Directory Entry (16 bytes) + Bitmap data
function createMinimalIco() {
    // ICO Header
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);      // Reserved (must be 0)
    header.writeUInt16LE(1, 2);      // Image type (1 = ICO)
    header.writeUInt16LE(1, 4);      // Number of images (1)

    // Directory Entry
    const dirEntry = Buffer.alloc(16);
    dirEntry.writeUInt8(32, 0);      // Width (32)
    dirEntry.writeUInt8(32, 1);      // Height (32)
    dirEntry.writeUInt8(0, 2);       // Color palette (0 = no palette)
    dirEntry.writeUInt8(0, 3);       // Reserved
    dirEntry.writeUInt16LE(1, 4);    // Color planes
    dirEntry.writeUInt16LE(32, 6);   // Bits per pixel

    // Create a simple 32x32 32-bit bitmap
    const bitmapInfoSize = 40;
    const imageDataSize = 32 * 32 * 4; // 32x32 pixels, 4 bytes each (BGRA)
    const totalBitmapSize = bitmapInfoSize + imageDataSize;

    dirEntry.writeUInt32LE(totalBitmapSize, 8);  // Size of image data
    dirEntry.writeUInt32LE(22, 12);               // Offset to image data (6 + 16 = 22)

    // Bitmap Info Header (BITMAPINFOHEADER)
    const bmpHeader = Buffer.alloc(bitmapInfoSize);
    bmpHeader.writeUInt32LE(40, 0);     // Header size
    bmpHeader.writeInt32LE(32, 4);      // Width
    bmpHeader.writeInt32LE(64, 8);      // Height (doubled for ICO format - includes mask)
    bmpHeader.writeUInt16LE(1, 12);     // Planes
    bmpHeader.writeUInt16LE(32, 14);    // Bits per pixel
    bmpHeader.writeUInt32LE(0, 16);     // Compression (none)
    bmpHeader.writeUInt32LE(imageDataSize, 20);  // Image size
    bmpHeader.writeInt32LE(0, 24);      // X pixels per meter
    bmpHeader.writeInt32LE(0, 28);      // Y pixels per meter
    bmpHeader.writeUInt32LE(0, 32);     // Colors used
    bmpHeader.writeUInt32LE(0, 36);     // Important colors

    // Create pixel data - a blue square with a white microphone shape
    const pixels = Buffer.alloc(imageDataSize);

    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const idx = (y * 32 + x) * 4;

            // Blue background (#3B82F6)
            let r = 0x3B;
            let g = 0x82;
            let b = 0xF6;
            let a = 0xFF;

            // Simple white circle in the middle (microphone representation)
            const cx = 16, cy = 16;
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            if (dist < 10) {
                r = g = b = 0xFF; // White
            }

            // BGRA format
            pixels[idx] = b;
            pixels[idx + 1] = g;
            pixels[idx + 2] = r;
            pixels[idx + 3] = a;
        }
    }

    return Buffer.concat([header, dirEntry, bmpHeader, pixels]);
}

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Write the ICO file
const icoData = createMinimalIco();
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoData);
console.log('Created icon.ico');

// Copy for 32x32.png placeholder (it's actually an ico but that's fine for dev)
fs.writeFileSync(path.join(iconsDir, '32x32.png'), icoData);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), icoData);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), icoData);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), icoData);

console.log('Icon files generated for development');

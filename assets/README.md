# Extension Icons

This directory needs three PNG icon files for the Chrome extension:

- `icon-16.png` (16x16 pixels)
- `icon-48.png` (48x48 pixels) 
- `icon-128.png` (128x128 pixels)

## Creating Icons from Template

Use the provided `icon-template.svg` to create the PNG files:

### Method 1: Online Converter
1. Visit [SVG to PNG converter](https://convertio.co/svg-png/) or similar
2. Upload `icon-template.svg`
3. Set output size to 128x128, 48x48, and 16x16 respectively
4. Download and rename to `icon-128.png`, `icon-48.png`, `icon-16.png`

### Method 2: Using Inkscape (Free)
1. Install [Inkscape](https://inkscape.org/)
2. Open `icon-template.svg`
3. Go to File → Export PNG Image
4. Set width/height to 128, 48, and 16 pixels respectively
5. Save as `icon-128.png`, `icon-48.png`, `icon-16.png`

### Method 3: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# On macOS: brew install imagemagick
# On Ubuntu: sudo apt-get install imagemagick

# Convert to different sizes
convert icon-template.svg -resize 128x128 icon-128.png
convert icon-template.svg -resize 48x48 icon-48.png
convert icon-template.svg -resize 16x16 icon-16.png
```

### Method 4: Using Figma/Sketch
1. Import `icon-template.svg` into Figma or Sketch
2. Create artboards at 128x128, 48x48, and 16x16
3. Export as PNG at 1x resolution
4. Rename files appropriately

## Icon Design

The template features:
- **Blue circle background** (#007bff) - matches extension color scheme
- **White document** - represents forms/React components
- **Blue form field lines** - suggests form structure
- **Yellow magnifying glass** - indicates inspection/debugging

Feel free to modify the design while keeping it recognizable as a form inspection tool.

## Alternative Quick Solution

If you need icons immediately, you can use simple colored squares temporarily:
1. Create 128x128, 48x48, and 16x16 solid blue (#007bff) PNG files
2. Add white "F" text in the center for "Formik"
3. Replace with proper icons later

The extension will work with any 16x16, 48x48, and 128x128 PNG files in this directory.
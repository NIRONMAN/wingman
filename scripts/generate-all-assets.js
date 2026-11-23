const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const SOURCE_IMG = path.join(ASSETS_DIR, 'logo-source.png');
const RES_DIR = path.join(ROOT_DIR, 'android/app/src/main/res');

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

console.log('--- 1. Generating SVG Vector (assets/wingman-logo.svg) ---');
// viewBox 0 0 1254 1254 to match original coordinates directly
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254" width="100%" height="100%">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0E1E38" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#080C14" stop-opacity="1"/>
    </radialGradient>

    <!-- Wing Linear Gradient -->
    <linearGradient id="wingGradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#196CFD"/>
      <stop offset="30%" stop-color="#1B85FE"/>
      <stop offset="70%" stop-color="#1894FD"/>
      <stop offset="100%" stop-color="#0AF9FF"/>
    </linearGradient>

    <!-- Orb Gradient & Glow -->
    <radialGradient id="orbGradient" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#70F3FF"/>
      <stop offset="70%" stop-color="#06CCFC"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </radialGradient>

    <filter id="orbGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="1254" height="1254" rx="0" fill="#080C14"/>

  <!-- Top Swept Wing and Chevron Frame -->
  <path d="M 1045,396 L 666,777 L 641,794 L 598,811 L 521,824 L 510,823 L 798,534 L 305,533 C 275,525 242,506 211,475 C 192,447 185,442 205,440 L 853,446 C 901,438 980,418 1045,396 Z"
        fill="url(#wingGradient)"/>

  <!-- Middle Aerodynamic Slat -->
  <path d="M 299,574 L 718,575 L 637,656 L 389,654 C 362,645 332,626 310,604 C 290,575 292,574 299,574 Z"
        fill="url(#wingGradient)"/>

  <!-- Lower Triangle Slat -->
  <path d="M 408,692 L 601,692 L 502,791 Z"
        fill="url(#wingGradient)"/>

  <!-- Satellite Companion / Physical Node Orb -->
  <circle cx="984" cy="599" r="51" fill="url(#orbGradient)" filter="url(#orbGlow)"/>
</svg>
`;

fs.writeFileSync(path.join(ASSETS_DIR, 'wingman-logo.svg'), svgContent, 'utf8');
console.log('Saved assets/wingman-logo.svg');

console.log('--- 2. Generating Standard App Icon (assets/icon.png) ---');
execSync(`magick "${SOURCE_IMG}" -resize 1024x1024 "${path.join(ASSETS_DIR, 'icon.png')}"`);
console.log('Generated assets/icon.png (1024x1024)');

console.log('--- 3. Generating Android Adaptive Icon (assets/adaptive-icon.png) ---');
// Scale to 736x736 inside 1024x1024 with #080C14 background so emblem is 100% inside 66% circle
execSync(`magick "${SOURCE_IMG}" -resize 736x736 -background "#080C14" -gravity center -extent 1024x1024 "${path.join(ASSETS_DIR, 'adaptive-icon.png')}"`);
console.log('Generated assets/adaptive-icon.png (1024x1024 safe zone)');

console.log('--- 4. Generating Splash Screen Icon (assets/splash-icon.png) ---');
execSync(`magick "${SOURCE_IMG}" -resize 512x512 -background "#080C14" -gravity center -extent 1024x1024 "${path.join(ASSETS_DIR, 'splash-icon.png')}"`);
console.log('Generated assets/splash-icon.png (1024x1024)');

console.log('--- 5. Generating Web Favicon (assets/favicon.png) ---');
execSync(`magick "${path.join(ASSETS_DIR, 'icon.png')}" -resize 64x64 "${path.join(ASSETS_DIR, 'favicon.png')}"`);
console.log('Generated assets/favicon.png (64x64)');

console.log('--- 6. Generating Transparent UI Emblem (assets/wingman-emblem.png) ---');
// Transparent emblem for in-app headers
execSync(`magick "${SOURCE_IMG}" -fuzz 14% -transparent "srgb(9,16,32)" -trim +repage "${path.join(ASSETS_DIR, 'wingman-emblem.png')}"`);
console.log('Generated assets/wingman-emblem.png (trimmed transparent)');

console.log('--- 7. Generating Android Native Mipmap Icons ---');
const densities = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

for (const { name, size } of densities) {
  const targetDir = path.join(RES_DIR, name);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const r = Math.round(size * 0.20);
  const tempBase = `/tmp/base_${size}.png`;
  const tempSquircle = `/tmp/mask_squircle_${size}.png`;
  const tempCircle = `/tmp/mask_circle_${size}.png`;

  // Base resized from adaptive-icon (with safe margins)
  execSync(`magick "${path.join(ASSETS_DIR, 'adaptive-icon.png')}" -resize ${size}x${size} ${tempBase}`);

  // Squircle Mask
  execSync(`magick -size ${size}x${size} xc:none -fill white -draw "roundrectangle 0,0,${size - 1},${size - 1},${r},${r}" ${tempSquircle}`);
  const icLauncherPath = path.join(targetDir, 'ic_launcher.png');
  execSync(`magick ${tempBase} ${tempSquircle} -alpha off -compose CopyOpacity -composite "${icLauncherPath}"`);

  // Circle Mask
  execSync(`magick -size ${size}x${size} xc:none -fill white -draw "circle ${size / 2},${size / 2} ${size / 2},1" ${tempCircle}`);
  const icLauncherRoundPath = path.join(targetDir, 'ic_launcher_round.png');
  execSync(`magick ${tempBase} ${tempCircle} -alpha off -compose CopyOpacity -composite "${icLauncherRoundPath}"`);

  console.log(`Updated ${name}: ic_launcher.png and ic_launcher_round.png (${size}x${size})`);
}

console.log('All assets successfully built!');

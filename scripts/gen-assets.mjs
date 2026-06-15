// Rasterize the SVG app mark into the source images @capacitor/assets needs:
// a 1024 icon and 2732 splashes (dark background + centered logo).
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";

const BG = "#0c0a09";
mkdirSync("assets", { recursive: true });
const svg = readFileSync("public/icon.svg");

// Crisp 1024 icon (render the vector at high density, not upscaled).
await sharp(svg, { density: 600 }).resize(1024, 1024).png().toFile("assets/icon-only.png");

// Splash: the logo centered on the app's dark background.
const logo = await sharp(svg, { density: 600 }).resize(820, 820).png().toBuffer();
for (const name of ["splash.png", "splash-dark.png"]) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`assets/${name}`);
}
console.log("wrote assets/icon-only.png, assets/splash.png, assets/splash-dark.png");

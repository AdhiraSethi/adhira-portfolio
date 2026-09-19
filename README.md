# Adhira Sethi | Portfolio

A static portfolio site: plain HTML, CSS and JavaScript, with a three.js hero. No build step.

## Run it
Open `index.html` in a browser. Or serve the folder locally:

    python3 -m http.server 8000

then visit http://localhost:8000

## Structure
- `index.html`        page content (about, projects, experience, skills, achievements, contact)
- `css/style.css`     design tokens (light and dark themes) and all styling
- `js/main.js`        theme toggle, menu, card tilt, heatmap, and the 3D hand scene
- `js/vendor/three.min.js`  three.js r128, bundled so the 3D hero works offline

Google Fonts (Unbounded, Instrument Sans) load from the web; the site falls back to system fonts without a connection.

## Customize
- **Colors:** edit the `--g1`, `--g2`, `--g3`, `--cool` tokens at the top of `css/style.css` (one set for light, one for dark).
- **Text and links:** edit `index.html`. Search for "SignBridge" to add a GitHub or demo link.
- **Real screenshots:** replace the `.viz` blocks inside each `.proj` article with an `<img>`.
- **Photo:** replace the `AS` monogram in `.id-mark` with an `<img>`.
- **Gestures:** the `POSES` array in `js/main.js` controls the hand's gesture loop.

## Deploy (free)
- **GitHub Pages:** push this folder to a repo, then Settings > Pages > deploy from the `main` branch root.
- **Netlify or Vercel:** drag the folder in, or import the repo. No build command needed.

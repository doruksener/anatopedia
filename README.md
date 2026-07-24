# Anatopedia

Anatopedia is a browser-based 3D anatomy explorer built with Three.js. It loads
selected BodyParts3D structures, groups them into anatomical systems, and lets
users rotate, isolate, search, hide, and adjust layer opacity.

## Current scope

- layered 3D anatomy viewer;
- structure search using FMA identifiers and names;
- system presets for skeleton, muscles, organs, vessels, nerves, and skin;
- clipping planes for axial, coronal, and sagittal exploration;
- optional local model cache for faster repeated use;
- an imaging workspace placeholder for future licensed datasets.

The default segmented 3D source is an adult male BodyParts3D atlas. A female 3D
atlas and medical imaging datasets are **not** bundled. The application does not
relabel male geometry as female anatomy.

## Run on Windows

1. Download or clone the repository.
2. Double-click `ANATOPEDIA_BASLAT.bat`.
3. Keep the terminal window open while using the application.
4. The browser should open automatically.

Do not open `index.html` directly with `file://`; ES modules and model requests
require a local HTTP server.

### Optional local model preparation

Run `ANATOPEDIA_VERI_HAZIRLA.bat` once to download a selected BodyParts3D subset
to `models/stl/`. These large files are ignored by Git and are not included in
the public repository.

## Data and licensing

The repository contains application code and an original schematic placeholder.
It does not contain third-party anatomy meshes or medical images.

- Application code: MIT License.
- BodyParts3D data downloaded at runtime: CC BY-SA 2.1 Japan.
- Three.js: MIT License.

See `THIRD_PARTY_NOTICES.md` before redistributing downloaded or converted model
data.

## Safety and limitations

Anatopedia is an educational project, not a diagnostic tool or medical device.
Do not commit patient data, credentials, proprietary datasets, or unlicensed
media. See `DISCLAIMER.md` and `SECURITY.md`.

## Repository layout

```text
assets/                 Original local UI assets
data/                   Optional expert-reviewed content files
docs/                   Dataset integration notes
models/stl/              Local downloaded meshes; ignored by Git
tools/                   Dataset preparation scripts
app.js                   Viewer logic
index.html               Application shell
styles.css               Interface styles
```

## Known limitations

- automatic name-based system classification is imperfect;
- the full atlas is too large to keep entirely in GPU memory;
- female 3D anatomy is not included;
- imaging data is not included;
- anatomy and clinical text require expert review before educational release.

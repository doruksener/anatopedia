# Anatopedia

Anatopedia is a browser-based, layered 3D human anatomy explorer built with Three.js. It is an early technical prototype for exploring anatomical structures, systems, regions, clipping planes, and future expert-reviewed educational content.

> **Current status:** public alpha / research prototype. It is not a finished anatomy curriculum, diagnostic product, or medical device.

## Current capabilities

- load real BodyParts3D STL structures;
- rotate, zoom, select, isolate, hide, and remove meshes;
- search structures by English name or FMA identifier;
- explore skeleton, muscles, organs, vessels, nerves, lymphatic structures, skin, fascia, cartilage, and ligaments;
- adjust system opacity and move from outer to deeper layers;
- use axial, coronal, and sagittal clipping planes;
- cache a selected local model subset for faster repeated use;
- open a placeholder imaging workspace for future licensed MR/CT datasets.

## Anatomical scope

The default segmented 3D source is an adult male BodyParts3D atlas. A separate, validated female 3D atlas is **not** bundled. Anatopedia does not relabel male geometry as female anatomy.

The imaging workspace contains only an original schematic placeholder. No real MR, CT, DICOM, NIfTI, patient image, or third-party anatomical slice is included.

## Run on Windows

1. Download or clone the repository.
2. Double-click `ANATOPEDIA_BASLAT.bat`.
3. Keep the terminal window open while using the application.
4. The browser should open automatically.

Do not open `index.html` directly with `file://`. ES modules and model requests require a local HTTP server.

## Optional local model preparation

Double-click `ANATOPEDIA_VERI_HAZIRLA.bat` and choose:

- **1 — Fast core package:** downloads a practical subset of commonly used structures.
- **2 — Core package + skin:** also downloads the large skin mesh.

Downloaded STL files and `models/stl/manifest.json` stay local and are ignored by Git. The public repository does not bundle third-party anatomy meshes.

## Data and licensing

- Original Anatopedia application code: MIT License.
- BodyParts3D data downloaded at runtime or locally: CC BY-SA 2.1 Japan.
- Three.js: MIT License.

The MIT license applies to Anatopedia's original code, not to downloaded BodyParts3D geometry. See `THIRD_PARTY_NOTICES.md` and `docs/DATASETS.md` before redistributing models or adding datasets.

## Safety and limitations

Anatopedia is an educational software project. It is not intended to diagnose, treat, prevent, monitor, or make decisions about disease or injury.

Do not commit patient data, credentials, proprietary datasets, DICOM/NIfTI files, or unlicensed media. Clinical and pain-related content must be source-cited and reviewed by qualified experts before release. See `DISCLAIMER.md` and `SECURITY.md`.

## Repository layout

```text
assets/                         Original UI and placeholder assets
data/                           Optional expert-reviewed content files
docs/                           Dataset and integration documentation
models/stl/                     Locally downloaded meshes; ignored by Git
tools/                          Dataset preparation utilities
ANATOPEDIA_BASLAT.bat           Windows launcher
ANATOPEDIA_VERI_HAZIRLA.bat     Optional model preparation launcher
app.js                          Viewer logic
index.html                      Application shell
styles.css                      Interface styles
```

## Known limitations

- structure-to-system classification is currently name-based and imperfect;
- the complete atlas is too large to keep entirely in browser GPU memory;
- a validated female 3D anatomy atlas is not included;
- real medical imaging data is not included;
- anatomy and clinical text require expert review and source versioning;
- production development should move toward optimized GLB/Meshopt assets, a versioned anatomy knowledge graph, and explicit dataset adapters.

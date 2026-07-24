# Dataset integration

## Included by default

No 3D mesh or medical imaging dataset is committed to the repository.
Anatopedia retrieves selected BodyParts3D STL files from a pinned source
snapshot or reads locally prepared files from `models/stl/`.

Pinned BodyParts3D snapshot:
`f0eeb6e843380cfe6b83797cf8c3e1af74de5e61`

Run `ANATOPEDIA_VERI_HAZIRLA.bat` on Windows to prepare a local subset. The
downloaded files are ignored by Git.

## Female anatomy

A segmented female 3D atlas is not included. Do not relabel or non-uniformly
scale the male BodyParts3D geometry as female anatomy. A female dataset should
use its own geometry, identifiers, validation process, and license notices.

## Imaging data

The imaging screen contains an original schematic placeholder only. Before
adding MR, CT, DICOM, NIfTI, or anatomical slice data:

1. verify the license and redistribution terms;
2. remove all identifying metadata and burned-in identifiers;
3. keep patient data outside the repository;
4. document provenance and preprocessing;
5. obtain clinical and legal review where applicable.

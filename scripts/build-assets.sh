#!/usr/bin/env bash
# Convert raster Thai QR Payment / PromptPay marks into SVG assets.
#
# Two SVG flavors are produced per source image, both true vectors
# (no embedded raster):
#   1. `<name>.svg`            — color SVG traced via vtracer
#      (multi-shade path output). Roughly 5-20× smaller than embedding
#      the bitmap as base64, and scales infinitely without re-rastering.
#   2. `<name>.silhouette.svg` — monochrome silhouette traced via potrace.
#      Smallest of the lot; suitable for masks / icons / dark mode.
#
# Both flavors are SVGO-optimised (multipass) after tracing.
#
# Requires: vtracer, potrace, ImageMagick (`magick`), and pnpm/svgo.
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SRC_DIR="${1:-/Users/uunw/Downloads/Thai_QR_Payment_Logo/Thai QR}"
OUT_DIR="${ROOT_DIR}/packages/assets/src/svg"

VTRACER="${VTRACER:-vtracer}"
if ! command -v "${VTRACER}" >/dev/null 2>&1; then
  if [[ -x "$HOME/.cargo/bin/vtracer" ]]; then
    VTRACER="$HOME/.cargo/bin/vtracer"
  else
    echo "vtracer not found in PATH; install via 'cargo install vtracer'" >&2
    exit 1
  fi
fi

mkdir -p "${OUT_DIR}"

if [[ ! -d "${SRC_DIR}" ]]; then
  echo "Source directory not found: ${SRC_DIR}" >&2
  exit 1
fi

# vtracer prefers a uniform input format; convert everything to PNG
# first to avoid format-specific surprises. We also down-scale very
# large images so the output path count stays small.
TMP_DIR=$(mktemp -d -t tqrp-XXXXXX)
trap "rm -rf '${TMP_DIR}'" EXIT

for src in "${SRC_DIR}"/*.{png,jpg}; do
  [[ -f "${src}" ]] || continue
  base=$(basename "${src}")
  stem="${base%.*}"
  echo "→ ${base}"

  pre_png="${TMP_DIR}/${stem}.png"
  magick "${src}" -alpha remove -alpha off -resize '1024x1024>' "${pre_png}"

  # ── Colour vector ─────────────────────────────────────────────────
  raw_svg="${TMP_DIR}/${stem}.color.svg"
  "${VTRACER}" \
    --input "${pre_png}" \
    --output "${raw_svg}" \
    --colormode color \
    --hierarchical stacked \
    --filter_speckle 4 \
    --color_precision 6 \
    --gradient_step 16 \
    --corner_threshold 60 \
    --segment_length 5 \
    --splice_threshold 45 \
    --path_precision 2 \
    --mode polygon

  # ── Silhouette ───────────────────────────────────────────────────
  pgm="${TMP_DIR}/${stem}.pgm"
  magick "${pre_png}" -alpha remove -alpha off -colorspace gray -threshold 50% "${pgm}"
  raw_silhouette="${TMP_DIR}/${stem}.silhouette.svg"
  potrace "${pgm}" --svg --output "${raw_silhouette}" --tight --color "#0a2540"

  cp "${raw_svg}" "${OUT_DIR}/${stem}.svg"
  cp "${raw_silhouette}" "${OUT_DIR}/${stem}.silhouette.svg"
done

# ── SVGO multipass ───────────────────────────────────────────────────
echo "→ optimising with svgo"
pnpm --dir "${ROOT_DIR}" exec svgo --quiet --multipass --recursive -i "${OUT_DIR}" >/dev/null

echo "✓ Assets written to ${OUT_DIR}"
du -h "${OUT_DIR}"/*.svg | sort -h

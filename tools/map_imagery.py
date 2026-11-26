"""Generate Raster MTS recipes and download aligned demo map images."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

import requests

YEARS = ("1963", "1976", "1982")
NAME = r"[A-Za-z0-9_-]+"
IMAGE_TYPES = {"image/png": ".png", "image/jpeg": ".jpg"}


def raster_recipe(source: str, minzoom: int, maxzoom: int, bands: str) -> dict:
    colors = {"gray": ["gray"], "rgb": ["red", "green", "blue"],
              "rgba": ["red", "green", "blue", "alpha"]}[bands]
    return {
        "version": 1,
        "type": "raster",
        "sources": [{"uri": f"mapbox://tileset-source/{source}"}],
        "minzoom": minzoom,
        "maxzoom": maxzoom,
        "layers": {
            "imagery": {
                "source_rules": {"filter": [["==", ["get", "colorinterp"], color] for color in colors]},
            },
        },
    }


def export_images(styles: dict[str, str], camera: str, output: Path, token: str) -> None:
    images = {}
    for year, style in styles.items():
        try:
            response = requests.get(
                f"https://api.mapbox.com/styles/v1/{style}/static/{camera}/960x540@2x",
                params={"access_token": token, "logo": "true", "attribution": "true"},
                timeout=(5, 25),
                allow_redirects=False,
            )
        except requests.RequestException:
            raise RuntimeError(f"{year}: Static Images API could not be reached") from None
        mime = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
        if response.status_code != 200 or mime not in IMAGE_TYPES or not response.content:
            raise RuntimeError(f"{year}: Static Images API returned HTTP {response.status_code} without an image")
        images[year + IMAGE_TYPES[mime]] = response.content

    output.mkdir(parents=True)
    for name, data in images.items():
        (output / name).write_bytes(data)
    print(f"Saved {len(images)} images with the same camera to {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    recipe = commands.add_parser("recipe", help="Print a Raster MTS recipe without contacting Mapbox")
    recipe.add_argument("source", help="Uploaded source in account/source format")
    recipe.add_argument("--minzoom", type=int, default=10)
    recipe.add_argument("--maxzoom", type=int, default=17)
    recipe.add_argument("--bands", choices=("gray", "rgb", "rgba"), default="rgb")
    evidence = commands.add_parser("evidence", help="Download four aligned, attributed slide images")
    evidence.add_argument("--output", type=Path, required=True, help="New output directory")
    evidence.add_argument("--center", type=float, nargs=2, required=True, metavar=("LNG", "LAT"))
    evidence.add_argument("--zoom", type=float, default=14)
    for year in YEARS:
        evidence.add_argument(f"--style-{year}", dest=f"style_{year}", required=True, metavar="ACCOUNT/STYLE")
    evidence.add_argument("--style-modern", default="mapbox/light-v11", metavar="ACCOUNT/STYLE")
    args = parser.parse_args()

    if args.command == "recipe":
        if not re.fullmatch(fr"{NAME}/{NAME}", args.source):
            recipe.error("Expected an uploaded source in account/source format")
        if not 0 <= args.minzoom <= args.maxzoom <= 22:
            recipe.error("Expected 0 <= minzoom <= maxzoom <= 22")
        print(json.dumps(raster_recipe(args.source, args.minzoom, args.maxzoom, args.bands), indent=2))
        return

    token = os.getenv("VTN_MAPBOX_STATIC_TOKEN", "").strip()
    if os.getenv("VTN_MAPBOX_ENABLED") != "1" or not re.fullmatch(fr"pk\.{NAME}\.{NAME}", token):
        evidence.error("Set VTN_MAPBOX_ENABLED=1 and VTN_MAPBOX_STATIC_TOKEN locally before exporting")
    styles = {year: getattr(args, f"style_{year}") for year in YEARS}
    styles["modern"] = args.style_modern
    if len(set(styles.values())) != len(styles):
        evidence.error("Use four distinct styles with the corresponding imagery year in each historical style")
    for style in styles.values():
        if not re.fullmatch(fr"{NAME}/{NAME}", style) or style.startswith("mapbox/standard"):
            evidence.error("Use a Static Images-compatible account/style identifier")
    lng, lat = args.center
    if not (-180 <= lng <= 180 and -85 <= lat <= 85 and 0 <= args.zoom <= 22):
        evidence.error("Camera is outside the Static Images coordinate or zoom range")
    if args.output.exists():
        evidence.error("The output directory already exists")
    try:
        export_images(styles, f"{lng},{lat},{args.zoom},0,0", args.output, token)
    except (RuntimeError, OSError) as error:
        evidence.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()

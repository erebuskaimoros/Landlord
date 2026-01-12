#!/usr/bin/env python3
"""
Sort Photos by Location

A script that sorts images into folders based on their GPS metadata
and a list of known location addresses.

Usage:
    python sort_photos_by_location.py --addresses addresses.txt --images ./photos --output ./sorted
"""

import argparse
import json
import os
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Protocol, Callable

try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

try:
    from geopy.geocoders import Nominatim
    from geopy.distance import geodesic
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
except ImportError:
    print("Error: geopy is required. Install with: pip install geopy")
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    # Fallback if tqdm not installed
    def tqdm(iterable, **kwargs):
        return iterable

# HEIC/HEIF support (optional)
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False


# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.tiff', '.tif', '.heic', '.heif'}


class ProgressCallback(Protocol):
    """Protocol for progress reporting during sorting operations."""

    def on_geocoding_start(self, total: int) -> None:
        """Called when geocoding begins."""
        ...

    def on_geocoding_progress(self, current: int, address: str, success: bool) -> None:
        """Called after each address is geocoded."""
        ...

    def on_geocoding_complete(self, successful: int, total: int) -> None:
        """Called when all geocoding is complete."""
        ...

    def on_scanning_start(self) -> None:
        """Called when image scanning begins."""
        ...

    def on_scanning_complete(self, count: int) -> None:
        """Called when image scanning is complete."""
        ...

    def on_sorting_start(self, total: int) -> None:
        """Called when image sorting begins."""
        ...

    def on_sorting_progress(self, current: int, filename: str, destination: str) -> None:
        """Called after each image is processed."""
        ...

    def on_sorting_complete(self, stats: dict) -> None:
        """Called when sorting is complete."""
        ...

    def on_log(self, message: str) -> None:
        """Called for general log messages."""
        ...

    def is_cancelled(self) -> bool:
        """Check if operation should be cancelled."""
        ...


class CLIProgressCallback:
    """Default callback that uses tqdm for CLI progress display."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self._cancelled = False
        self._geocode_pbar = None
        self._sort_pbar = None

    def on_geocoding_start(self, total: int) -> None:
        print("Geocoding addresses...")
        self._geocode_pbar = tqdm(total=total, desc="Geocoding")

    def on_geocoding_progress(self, current: int, address: str, success: bool) -> None:
        if self._geocode_pbar:
            self._geocode_pbar.update(1)
        if not success:
            print(f"  Warning: Could not geocode '{address}'")

    def on_geocoding_complete(self, successful: int, total: int) -> None:
        if self._geocode_pbar:
            self._geocode_pbar.close()
        print(f"\nSuccessfully geocoded {successful}/{total} addresses")

    def on_scanning_start(self) -> None:
        pass

    def on_scanning_complete(self, count: int) -> None:
        print(f"Found {count} images")

    def on_sorting_start(self, total: int) -> None:
        print("\nSorting images...")
        self._sort_pbar = tqdm(total=total, desc="Processing")

    def on_sorting_progress(self, current: int, filename: str, destination: str) -> None:
        if self._sort_pbar:
            self._sort_pbar.update(1)
        if self.verbose:
            print(f"  {filename} -> {destination}")

    def on_sorting_complete(self, stats: dict) -> None:
        if self._sort_pbar:
            self._sort_pbar.close()

    def on_log(self, message: str) -> None:
        if self.verbose:
            print(message)

    def is_cancelled(self) -> bool:
        return self._cancelled


@dataclass
class GPSCoordinates:
    """Represents GPS coordinates."""
    latitude: float
    longitude: float

    def as_tuple(self) -> tuple[float, float]:
        return (self.latitude, self.longitude)


@dataclass
class Location:
    """Represents a named location with coordinates."""
    name: str
    address: str
    coordinates: Optional[GPSCoordinates] = None


def dms_to_decimal(dms_tuple, ref: str) -> float:
    """
    Convert GPS coordinates from degrees/minutes/seconds to decimal format.

    Args:
        dms_tuple: Tuple of (degrees, minutes, seconds)
        ref: Reference direction ('N', 'S', 'E', 'W')

    Returns:
        Decimal representation of the coordinate
    """
    try:
        # Handle different formats from EXIF data
        if hasattr(dms_tuple[0], 'numerator'):
            # IFDRational format
            degrees = float(dms_tuple[0].numerator) / float(dms_tuple[0].denominator)
            minutes = float(dms_tuple[1].numerator) / float(dms_tuple[1].denominator)
            seconds = float(dms_tuple[2].numerator) / float(dms_tuple[2].denominator)
        else:
            # Regular tuple format
            degrees = float(dms_tuple[0])
            minutes = float(dms_tuple[1])
            seconds = float(dms_tuple[2])

        decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)

        if ref in ('S', 'W'):
            decimal = -decimal

        return decimal
    except (TypeError, ZeroDivisionError, IndexError) as e:
        raise ValueError(f"Invalid DMS format: {dms_tuple}") from e


def extract_gps_from_image(image_path: Path) -> Optional[GPSCoordinates]:
    """
    Extract GPS coordinates from an image's EXIF data.

    Args:
        image_path: Path to the image file

    Returns:
        GPSCoordinates if found, None otherwise
    """
    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()

            if not exif_data:
                return None

            # Find GPS info in EXIF
            gps_info = {}
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'GPSInfo':
                    for gps_tag_id, gps_value in value.items():
                        gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_info[gps_tag] = gps_value

            if not gps_info:
                return None

            # Extract latitude
            if 'GPSLatitude' not in gps_info or 'GPSLatitudeRef' not in gps_info:
                return None

            lat = dms_to_decimal(
                gps_info['GPSLatitude'],
                gps_info['GPSLatitudeRef']
            )

            # Extract longitude
            if 'GPSLongitude' not in gps_info or 'GPSLongitudeRef' not in gps_info:
                return None

            lon = dms_to_decimal(
                gps_info['GPSLongitude'],
                gps_info['GPSLongitudeRef']
            )

            return GPSCoordinates(latitude=lat, longitude=lon)

    except Exception as e:
        print(f"Warning: Could not read GPS from {image_path.name}: {e}")
        return None


def geocode_address(address: str, geocoder: Nominatim) -> Optional[GPSCoordinates]:
    """
    Convert an address string to GPS coordinates using geocoding.

    Args:
        address: The address string to geocode
        geocoder: The geocoder instance to use

    Returns:
        GPSCoordinates if successful, None otherwise
    """
    try:
        location = geocoder.geocode(address, timeout=10)
        if location:
            return GPSCoordinates(
                latitude=location.latitude,
                longitude=location.longitude
            )
        return None
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"Warning: Geocoding failed for '{address}': {e}")
        return None


def load_addresses(addresses_input: str) -> list[str]:
    """
    Load addresses from a file or parse from comma-separated string.

    Args:
        addresses_input: Path to file or comma-separated addresses

    Returns:
        List of address strings
    """
    # Check if it's a file path
    if os.path.isfile(addresses_input):
        with open(addresses_input, 'r', encoding='utf-8') as f:
            # Handle both newline-separated and JSON array formats
            content = f.read().strip()

            # Try JSON format first
            if content.startswith('['):
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    pass

            # Fall back to line-separated format (skip empty lines and comments)
            addresses = [
                line.strip() for line in content.split('\n')
                if line.strip() and not line.strip().startswith('#')
            ]
            return addresses
    else:
        # Treat as comma-separated string
        return [addr.strip() for addr in addresses_input.split(',') if addr.strip()]


def find_images(folder_path: Path) -> list[Path]:
    """
    Find all image files in a folder (recursively).

    Args:
        folder_path: Path to the folder to search

    Returns:
        List of paths to image files
    """
    images = []
    for ext in IMAGE_EXTENSIONS:
        images.extend(folder_path.rglob(f'*{ext}'))
        images.extend(folder_path.rglob(f'*{ext.upper()}'))
    return list(set(images))  # Remove duplicates


def find_closest_location(
    coords: GPSCoordinates,
    locations: list[Location],
    max_distance_km: float = 0.5
) -> Optional[Location]:
    """
    Find the closest location to the given coordinates.

    Args:
        coords: The GPS coordinates to match
        locations: List of locations to compare against
        max_distance_km: Maximum distance in km to consider a match

    Returns:
        The closest Location if within max_distance, None otherwise
    """
    closest_location = None
    closest_distance = float('inf')

    for location in locations:
        if location.coordinates is None:
            continue

        distance = geodesic(
            coords.as_tuple(),
            location.coordinates.as_tuple()
        ).kilometers

        if distance < closest_distance:
            closest_distance = distance
            closest_location = location

    if closest_location and closest_distance <= max_distance_km:
        return closest_location

    return None


def sanitize_folder_name(name: str) -> str:
    """
    Convert a string to a valid folder name.

    Args:
        name: The string to sanitize

    Returns:
        A sanitized folder name
    """
    # Replace problematic characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')

    # Truncate if too long
    if len(name) > 100:
        name = name[:100]

    return name.strip()


def sort_photos(
    images_folder: Path,
    addresses: list[str],
    output_folder: Path,
    max_distance_km: float = 0.5,
    copy_mode: bool = False,
    verbose: bool = False,
    progress_callback: Optional[ProgressCallback] = None
) -> dict:
    """
    Sort photos into folders based on their proximity to known addresses.

    Args:
        images_folder: Path to folder containing images
        addresses: List of address strings
        output_folder: Path to output folder for sorted images
        max_distance_km: Maximum distance to consider for matching
        copy_mode: If True, copy files; if False, move files
        verbose: If True, print detailed progress
        progress_callback: Optional callback for progress reporting

    Returns:
        Dictionary with statistics about the sorting operation
    """
    # Use CLI callback if none provided
    if progress_callback is None:
        progress_callback = CLIProgressCallback(verbose=verbose)

    stats = {
        'total_images': 0,
        'sorted_images': 0,
        'no_gps_images': 0,
        'no_match_images': 0,
        'locations': {}
    }

    # Initialize geocoder
    geocoder = Nominatim(user_agent="photo_location_sorter")

    # Geocode all addresses
    locations: list[Location] = []
    progress_callback.on_geocoding_start(len(addresses))

    for i, address in enumerate(addresses):
        if progress_callback.is_cancelled():
            return stats

        coords = geocode_address(address, geocoder)
        location = Location(
            name=sanitize_folder_name(address),
            address=address,
            coordinates=coords
        )
        locations.append(location)
        progress_callback.on_geocoding_progress(i + 1, address, coords is not None)

    # Filter locations with valid coordinates
    valid_locations = [loc for loc in locations if loc.coordinates is not None]
    progress_callback.on_geocoding_complete(len(valid_locations), len(addresses))

    if not valid_locations:
        progress_callback.on_log("Error: No addresses could be geocoded.")
        return stats

    # Find all images
    progress_callback.on_scanning_start()
    images = find_images(images_folder)
    stats['total_images'] = len(images)
    progress_callback.on_scanning_complete(len(images))

    if not images:
        progress_callback.on_log("No images found in the specified folder.")
        return stats

    # Create output folder
    output_folder.mkdir(parents=True, exist_ok=True)

    # Create "unknown" folder for images without GPS or no match
    unknown_folder = output_folder / "_unknown_location"
    no_gps_folder = output_folder / "_no_gps_data"

    # Process each image
    progress_callback.on_sorting_start(len(images))

    for i, image_path in enumerate(images):
        if progress_callback.is_cancelled():
            return stats

        # Extract GPS coordinates
        coords = extract_gps_from_image(image_path)

        if coords is None:
            stats['no_gps_images'] += 1
            # Move to no GPS folder
            no_gps_folder.mkdir(exist_ok=True)
            dest = no_gps_folder / image_path.name
            if copy_mode:
                shutil.copy2(image_path, dest)
            else:
                shutil.move(str(image_path), dest)

            progress_callback.on_sorting_progress(i + 1, image_path.name, "_no_gps_data")
            continue

        # Find closest location
        closest = find_closest_location(coords, valid_locations, max_distance_km)

        if closest is None:
            stats['no_match_images'] += 1
            # Move to unknown folder
            unknown_folder.mkdir(exist_ok=True)
            dest = unknown_folder / image_path.name
            if copy_mode:
                shutil.copy2(image_path, dest)
            else:
                shutil.move(str(image_path), dest)

            progress_callback.on_sorting_progress(i + 1, image_path.name, "_unknown_location")
            continue

        # Create location folder and move image
        location_folder = output_folder / closest.name
        location_folder.mkdir(exist_ok=True)

        dest = location_folder / image_path.name

        # Handle filename conflicts
        counter = 1
        while dest.exists():
            stem = image_path.stem
            suffix = image_path.suffix
            dest = location_folder / f"{stem}_{counter}{suffix}"
            counter += 1

        if copy_mode:
            shutil.copy2(image_path, dest)
        else:
            shutil.move(str(image_path), dest)

        stats['sorted_images'] += 1

        # Track per-location stats
        if closest.name not in stats['locations']:
            stats['locations'][closest.name] = 0
        stats['locations'][closest.name] += 1

        progress_callback.on_sorting_progress(i + 1, image_path.name, closest.name)

    progress_callback.on_sorting_complete(stats)
    return stats


def print_stats(stats: dict):
    """Print a summary of the sorting operation."""
    print("\n" + "=" * 50)
    print("SORTING COMPLETE")
    print("=" * 50)
    print(f"Total images processed: {stats['total_images']}")
    print(f"Images sorted by location: {stats['sorted_images']}")
    print(f"Images without GPS data: {stats['no_gps_images']}")
    print(f"Images with no matching location: {stats['no_match_images']}")

    if stats['locations']:
        print("\nImages per location:")
        for location, count in sorted(stats['locations'].items(), key=lambda x: -x[1]):
            print(f"  {location}: {count}")


def main():
    # Launch GUI if no arguments provided
    if len(sys.argv) == 1:
        try:
            from gui import run_gui
            run_gui()
            return
        except ImportError as e:
            print(f"Could not launch GUI: {e}")
            print("Run with --help to see CLI usage.")
            sys.exit(1)

    parser = argparse.ArgumentParser(
        description='Sort photos into folders based on their GPS location metadata.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Launch the graphical interface
  python sort_photos_by_location.py

  # Using an addresses file (one address per line)
  python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted

  # Using comma-separated addresses
  python sort_photos_by_location.py -a "123 Main St, NYC,456 Oak Ave, LA" -i ./photos -o ./sorted

  # Copy instead of move, with verbose output
  python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted --copy --verbose

  # Increase max distance threshold
  python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted --max-distance 100
        """
    )

    parser.add_argument(
        '-a', '--addresses',
        required=True,
        help='Path to addresses file (one per line) or comma-separated addresses'
    )

    parser.add_argument(
        '-i', '--images',
        required=True,
        help='Path to folder containing images'
    )

    parser.add_argument(
        '-o', '--output',
        required=True,
        help='Path to output folder for sorted images'
    )

    parser.add_argument(
        '-d', '--max-distance',
        type=float,
        default=0.5,
        help='Maximum distance (km) to consider a location match (default: 0.5)'
    )

    parser.add_argument(
        '-c', '--copy',
        action='store_true',
        help='Copy files instead of moving them'
    )

    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Print detailed progress information'
    )

    args = parser.parse_args()

    # Validate inputs
    images_folder = Path(args.images)
    if not images_folder.exists():
        print(f"Error: Images folder does not exist: {args.images}")
        sys.exit(1)

    if not images_folder.is_dir():
        print(f"Error: Images path is not a directory: {args.images}")
        sys.exit(1)

    # Load addresses
    addresses = load_addresses(args.addresses)
    if not addresses:
        print("Error: No addresses provided")
        sys.exit(1)

    print(f"Loaded {len(addresses)} addresses")

    # Run sorting
    output_folder = Path(args.output)

    stats = sort_photos(
        images_folder=images_folder,
        addresses=addresses,
        output_folder=output_folder,
        max_distance_km=args.max_distance,
        copy_mode=args.copy,
        verbose=args.verbose
    )

    print_stats(stats)


if __name__ == '__main__':
    main()

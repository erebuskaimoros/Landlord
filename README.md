# Photo Location Sorter

A Python script that sorts images into folders based on their GPS metadata and a list of known location addresses.

## Features

- Extracts GPS coordinates from image EXIF data
- Geocodes addresses to GPS coordinates using OpenStreetMap (Nominatim)
- Calculates distances to find the closest matching location for each photo
- Organizes photos into folders named after their matched locations
- Handles images without GPS data or no matching location
- Supports both move and copy modes
- Configurable maximum distance threshold for matching

## Installation

1. Clone or download this repository
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted
```

### Command Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--addresses` | `-a` | Path to addresses file (one per line) or comma-separated addresses |
| `--images` | `-i` | Path to folder containing images |
| `--output` | `-o` | Path to output folder for sorted images |
| `--max-distance` | `-d` | Maximum distance (km) to consider a location match (default: 50) |
| `--copy` | `-c` | Copy files instead of moving them |
| `--verbose` | `-v` | Print detailed progress information |

### Address Input Formats

#### Text File (one address per line)
Create a file `addresses.txt`:
```
123 Main Street, New York, NY 10001
456 Oak Avenue, Los Angeles, CA 90001
789 Pine Road, Chicago, IL 60601
```

#### JSON Array
```json
[
  "123 Main Street, New York, NY 10001",
  "456 Oak Avenue, Los Angeles, CA 90001",
  "789 Pine Road, Chicago, IL 60601"
]
```

#### Comma-Separated (inline)
```bash
python sort_photos_by_location.py -a "123 Main St, NYC,456 Oak Ave, LA" -i ./photos -o ./sorted
```

### Examples

```bash
# Sort photos using addresses from a file
python sort_photos_by_location.py -a addresses.txt -i ./vacation_photos -o ./sorted_photos

# Copy instead of move (preserves originals)
python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted --copy

# Verbose output to see each file being processed
python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted --verbose

# Use a larger matching distance (100km radius)
python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted --max-distance 100

# Combine options
python sort_photos_by_location.py -a addresses.txt -i ./photos -o ./sorted -c -v -d 25
```

## Output Structure

After running the script, the output folder will contain:

```
sorted_photos/
├── 123_Main_Street,_New_York,_NY_10001/
│   ├── photo1.jpg
│   └── photo2.jpg
├── 456_Oak_Avenue,_Los_Angeles,_CA_90001/
│   └── photo3.jpg
├── _no_gps_data/
│   └── photo4.png
└── _unknown_location/
    └── photo5.jpg
```

- **Location folders**: Named after the matched addresses (sanitized for filesystem compatibility)
- **`_no_gps_data/`**: Photos that don't contain GPS metadata
- **`_unknown_location/`**: Photos with GPS data but no matching location within the max distance

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- TIFF (.tiff, .tif)
- HEIC (.heic, .heif)

## How It Works

1. **Geocoding**: Each address is converted to GPS coordinates using the Nominatim geocoding service
2. **EXIF Extraction**: GPS coordinates are extracted from each image's EXIF metadata
3. **Distance Calculation**: The geodesic distance between each photo's location and all known addresses is calculated
4. **Matching**: Each photo is matched to the closest address within the maximum distance threshold
5. **Sorting**: Photos are moved (or copied) to folders named after their matched location

## Tips

- **Address specificity**: More specific addresses (with city, state, zip) produce better geocoding results
- **Max distance**: Adjust `--max-distance` based on how spread out your locations are
  - Use smaller values (5-10 km) for locations in the same city
  - Use larger values (50-100 km) for locations spread across a region
- **Use copy mode first**: Test with `--copy` to verify results before moving files
- **Verbose mode**: Use `-v` when troubleshooting to see which photos match which locations

## Limitations

- Requires internet connection for geocoding addresses
- Geocoding is rate-limited (the script uses Nominatim's free service)
- Only works with images that have GPS EXIF data embedded
- Some camera apps or image editors strip GPS data for privacy

## Dependencies

- **Pillow**: Image processing and EXIF extraction
- **geopy**: Address geocoding and distance calculations
- **tqdm**: Progress bar display (optional)

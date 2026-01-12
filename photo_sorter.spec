# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Photo Location Sorter GUI

Build with: pyinstaller photo_sorter.spec
Output: dist/PhotoLocationSorter.exe (Windows)
"""

import sys
from pathlib import Path

block_cipher = None

# Get the project root
project_root = Path(SPECPATH)

# Collect data files
datas = [
    # Include example addresses file
    (str(project_root / 'example_addresses.txt'), '.'),
]

# Hidden imports for dependencies
hiddenimports = [
    # Geopy geocoders
    'geopy.geocoders',
    'geopy.geocoders.nominatim',
    # SSL/certificates for HTTPS requests
    'certifi',
    'ssl',
    # tkinter components
    'tkinter',
    'tkinter.ttk',
    'tkinter.filedialog',
    'tkinter.messagebox',
    'tkinter.scrolledtext',
    # PIL components
    'PIL._tkinter_finder',
]

# Check for pillow-heif and add if available
try:
    import pillow_heif
    hiddenimports.append('pillow_heif')
    hiddenimports.append('pillow_heif.HeifImagePlugin')
except ImportError:
    pass

a = Analysis(
    ['sort_photos_by_location.py'],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude unnecessary large packages
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'IPython',
        'jupyter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='PhotoLocationSorter',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Windowed mode (no console window)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add path to .ico file if available: 'icon.ico'
)

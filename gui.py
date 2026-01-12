#!/usr/bin/env python3
"""
Photo Location Sorter - GUI Module

A tkinter-based graphical interface for sorting photos by location.
"""

import queue
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
from pathlib import Path
from typing import Optional, Callable

from sort_photos_by_location import (
    sort_photos,
    load_addresses,
    HEIC_SUPPORTED,
)


class GUIProgressCallback:
    """Thread-safe callback that posts messages to the GUI queue."""

    def __init__(self, message_queue: queue.Queue, cancel_check: Callable[[], bool]):
        self.queue = message_queue
        self._is_cancelled = cancel_check

    def on_geocoding_start(self, total: int) -> None:
        self.queue.put(('geocoding_start', total))

    def on_geocoding_progress(self, current: int, address: str, success: bool) -> None:
        self.queue.put(('geocoding_progress', current, address, success))

    def on_geocoding_complete(self, successful: int, total: int) -> None:
        self.queue.put(('geocoding_complete', successful, total))

    def on_scanning_start(self) -> None:
        self.queue.put(('scanning_start',))

    def on_scanning_complete(self, count: int) -> None:
        self.queue.put(('scanning_complete', count))

    def on_sorting_start(self, total: int) -> None:
        self.queue.put(('sorting_start', total))

    def on_sorting_progress(self, current: int, filename: str, destination: str) -> None:
        self.queue.put(('sorting_progress', current, filename, destination))

    def on_sorting_complete(self, stats: dict) -> None:
        self.queue.put(('sorting_complete', stats))

    def on_log(self, message: str) -> None:
        self.queue.put(('log', message))

    def is_cancelled(self) -> bool:
        return self._is_cancelled()


class PhotoSorterGUI:
    """Main GUI application class."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Photo Location Sorter")
        self.root.geometry("700x650")
        self.root.minsize(600, 550)

        # State
        self.worker_thread: Optional[threading.Thread] = None
        self.message_queue: queue.Queue = queue.Queue()
        self.is_running = False
        self.cancel_requested = False
        self._current_total = 0
        self._current_phase = ''

        # Build UI
        self._create_widgets()
        self._start_queue_processor()

    def _create_widgets(self):
        """Build all UI components."""
        # Main container with padding
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky="nsew")

        # Configure grid weights for resizing
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)

        row = 0

        # === Images Folder Section ===
        ttk.Label(main_frame, text="Images Folder:").grid(
            row=row, column=0, sticky="w", pady=5
        )
        self.images_folder_var = tk.StringVar()
        images_entry = ttk.Entry(main_frame, textvariable=self.images_folder_var)
        images_entry.grid(row=row, column=1, sticky="ew", padx=5)
        ttk.Button(main_frame, text="Browse...", command=self._browse_images).grid(
            row=row, column=2
        )
        row += 1

        # === Output Folder Section ===
        ttk.Label(main_frame, text="Output Folder:").grid(
            row=row, column=0, sticky="w", pady=5
        )
        self.output_folder_var = tk.StringVar()
        output_entry = ttk.Entry(main_frame, textvariable=self.output_folder_var)
        output_entry.grid(row=row, column=1, sticky="ew", padx=5)
        ttk.Button(main_frame, text="Browse...", command=self._browse_output).grid(
            row=row, column=2
        )
        row += 1

        # === Addresses Section ===
        ttk.Label(main_frame, text="Addresses (one per line):").grid(
            row=row, column=0, sticky="nw", pady=(10, 5)
        )
        row += 1

        # Scrolled text area for addresses
        self.addresses_text = scrolledtext.ScrolledText(
            main_frame, height=8, width=60, wrap=tk.WORD
        )
        self.addresses_text.grid(row=row, column=0, columnspan=3, sticky="ew", pady=5)
        row += 1

        # Load from file button
        ttk.Button(
            main_frame,
            text="Load Addresses from File...",
            command=self._load_addresses_file,
        ).grid(row=row, column=0, columnspan=3, pady=5)
        row += 1

        # === Options Section ===
        options_frame = ttk.LabelFrame(main_frame, text="Options", padding="10")
        options_frame.grid(row=row, column=0, columnspan=3, sticky="ew", pady=10)
        row += 1

        # Max distance
        ttk.Label(options_frame, text="Max Distance (km):").grid(
            row=0, column=0, sticky="w"
        )
        self.max_distance_var = tk.DoubleVar(value=0.5)
        distance_spin = ttk.Spinbox(
            options_frame,
            from_=0.1,
            to=50,
            increment=0.1,
            textvariable=self.max_distance_var,
            width=10,
        )
        distance_spin.grid(row=0, column=1, sticky="w", padx=5)

        # Copy mode checkbox
        self.copy_mode_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            options_frame,
            text="Copy files (instead of moving)",
            variable=self.copy_mode_var,
        ).grid(row=0, column=2, padx=20)

        # === Progress Section ===
        progress_frame = ttk.LabelFrame(main_frame, text="Progress", padding="10")
        progress_frame.grid(row=row, column=0, columnspan=3, sticky="ew", pady=10)
        progress_frame.columnconfigure(0, weight=1)
        row += 1

        # Status label
        self.status_var = tk.StringVar(value="Ready")
        ttk.Label(progress_frame, textvariable=self.status_var).grid(
            row=0, column=0, sticky="w"
        )

        # Progress bar
        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(
            progress_frame, variable=self.progress_var, maximum=100, mode="determinate"
        )
        self.progress_bar.grid(row=1, column=0, sticky="ew", pady=5)

        # === Log Section ===
        ttk.Label(main_frame, text="Log:").grid(row=row, column=0, sticky="w")
        row += 1

        self.log_text = scrolledtext.ScrolledText(main_frame, height=10, state="disabled")
        self.log_text.grid(row=row, column=0, columnspan=3, sticky="nsew", pady=5)
        main_frame.rowconfigure(row, weight=1)
        row += 1

        # === Action Buttons ===
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=row, column=0, columnspan=3, pady=10)

        self.start_button = ttk.Button(
            button_frame, text="Start Sorting", command=self._start_sorting
        )
        self.start_button.pack(side="left", padx=5)

        self.cancel_button = ttk.Button(
            button_frame, text="Cancel", command=self._cancel_sorting, state="disabled"
        )
        self.cancel_button.pack(side="left", padx=5)

        # HEIC support indicator
        heic_status = "HEIC: Supported" if HEIC_SUPPORTED else "HEIC: Not available"
        heic_color = "green" if HEIC_SUPPORTED else "gray"
        ttk.Label(main_frame, text=heic_status, foreground=heic_color).grid(
            row=row + 1, column=0, columnspan=3, sticky="e"
        )

    def _browse_images(self):
        """Open folder browser for images folder."""
        folder = filedialog.askdirectory(title="Select Images Folder")
        if folder:
            self.images_folder_var.set(folder)

    def _browse_output(self):
        """Open folder browser for output folder."""
        folder = filedialog.askdirectory(title="Select Output Folder")
        if folder:
            self.output_folder_var.set(folder)

    def _load_addresses_file(self):
        """Load addresses from a file."""
        filepath = filedialog.askopenfilename(
            title="Select Addresses File",
            filetypes=[
                ("Text files", "*.txt"),
                ("JSON files", "*.json"),
                ("All files", "*.*"),
            ],
        )
        if filepath:
            try:
                addresses = load_addresses(filepath)
                self.addresses_text.delete("1.0", tk.END)
                self.addresses_text.insert("1.0", "\n".join(addresses))
                self._log(f"Loaded {len(addresses)} addresses from file")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load addresses: {e}")

    def _start_sorting(self):
        """Validate inputs and start the sorting thread."""
        # Validate inputs
        images_folder = self.images_folder_var.get().strip()
        output_folder = self.output_folder_var.get().strip()
        addresses_text = self.addresses_text.get("1.0", tk.END).strip()

        if not images_folder:
            messagebox.showerror("Error", "Please select an images folder.")
            return

        if not Path(images_folder).is_dir():
            messagebox.showerror("Error", "Images folder does not exist.")
            return

        if not output_folder:
            messagebox.showerror("Error", "Please select an output folder.")
            return

        if not addresses_text:
            messagebox.showerror("Error", "Please enter at least one address.")
            return

        # Parse addresses (one per line, skip empty lines and comments)
        addresses = [
            line.strip()
            for line in addresses_text.split("\n")
            if line.strip() and not line.strip().startswith("#")
        ]

        if not addresses:
            messagebox.showerror("Error", "No valid addresses found.")
            return

        # Update UI state
        self.is_running = True
        self.cancel_requested = False
        self.start_button.config(state="disabled")
        self.cancel_button.config(state="normal")
        self.progress_var.set(0)
        self._clear_log()
        self._log(f"Starting with {len(addresses)} addresses...")

        # Create callback
        callback = GUIProgressCallback(
            self.message_queue, lambda: self.cancel_requested
        )

        # Start worker thread
        self.worker_thread = threading.Thread(
            target=self._worker,
            args=(
                Path(images_folder),
                addresses,
                Path(output_folder),
                self.max_distance_var.get(),
                self.copy_mode_var.get(),
                callback,
            ),
            daemon=True,
        )
        self.worker_thread.start()

    def _worker(
        self,
        images_folder: Path,
        addresses: list,
        output_folder: Path,
        max_distance: float,
        copy_mode: bool,
        callback: GUIProgressCallback,
    ):
        """Worker thread that runs the sorting operation."""
        try:
            stats = sort_photos(
                images_folder=images_folder,
                addresses=addresses,
                output_folder=output_folder,
                max_distance_km=max_distance,
                copy_mode=copy_mode,
                verbose=False,
                progress_callback=callback,
            )
            # sorting_complete is called by sort_photos via callback
        except Exception as e:
            callback.on_log(f"ERROR: {e}")
        finally:
            self.message_queue.put(("finished",))

    def _cancel_sorting(self):
        """Request cancellation of the current operation."""
        self.cancel_requested = True
        self._log("Cancellation requested...")
        self.status_var.set("Cancelling...")

    def _start_queue_processor(self):
        """Start the periodic queue processor."""
        self._process_queue()

    def _process_queue(self):
        """Process messages from the worker thread (runs on main thread)."""
        try:
            while True:
                msg = self.message_queue.get_nowait()
                self._handle_message(msg)
        except queue.Empty:
            pass

        # Schedule next check
        self.root.after(100, self._process_queue)

    def _handle_message(self, msg):
        """Handle a message from the worker thread."""
        msg_type = msg[0]

        if msg_type == "geocoding_start":
            total = msg[1]
            self.status_var.set(f"Geocoding addresses (0/{total})...")
            self._current_total = total
            self._current_phase = "geocoding"

        elif msg_type == "geocoding_progress":
            current, address, success = msg[1], msg[2], msg[3]
            self.status_var.set(
                f"Geocoding addresses ({current}/{self._current_total})..."
            )
            # Progress from 0-30%
            self.progress_var.set((current / self._current_total) * 30)
            if not success:
                self._log(f"Warning: Could not geocode '{address}'")

        elif msg_type == "geocoding_complete":
            successful, total = msg[1], msg[2]
            self._log(f"Geocoded {successful}/{total} addresses")

        elif msg_type == "scanning_start":
            self.status_var.set("Scanning for images...")
            self.progress_var.set(35)

        elif msg_type == "scanning_complete":
            count = msg[1]
            self._log(f"Found {count} images")
            self.progress_var.set(40)

        elif msg_type == "sorting_start":
            total = msg[1]
            self._current_total = total
            self._current_phase = "sorting"
            self.status_var.set(f"Sorting images (0/{total})...")

        elif msg_type == "sorting_progress":
            current = msg[1]
            self.status_var.set(
                f"Sorting images ({current}/{self._current_total})..."
            )
            # Progress from 40% to 100%
            self.progress_var.set(40 + (current / self._current_total) * 60)

        elif msg_type == "sorting_complete":
            stats = msg[1]
            self._show_results(stats)

        elif msg_type == "log":
            self._log(msg[1])

        elif msg_type == "finished":
            self.is_running = False
            self.start_button.config(state="normal")
            self.cancel_button.config(state="disabled")
            if self.cancel_requested:
                self.status_var.set("Cancelled")
                self._log("Operation cancelled by user.")
            else:
                self.status_var.set("Complete")
                self.progress_var.set(100)

    def _show_results(self, stats: dict):
        """Display final results."""
        self._log("=" * 40)
        self._log("SORTING COMPLETE")
        self._log("=" * 40)
        self._log(f"Total images processed: {stats['total_images']}")
        self._log(f"Images sorted by location: {stats['sorted_images']}")
        self._log(f"Images without GPS data: {stats['no_gps_images']}")
        self._log(f"Images with no matching location: {stats['no_match_images']}")

        if stats["locations"]:
            self._log("")
            self._log("Images per location:")
            for location, count in sorted(
                stats["locations"].items(), key=lambda x: -x[1]
            ):
                self._log(f"  {location}: {count}")

        messagebox.showinfo(
            "Complete",
            f"Sorted {stats['sorted_images']} of {stats['total_images']} images.",
        )

    def _log(self, message: str):
        """Append a message to the log."""
        self.log_text.config(state="normal")
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state="disabled")

    def _clear_log(self):
        """Clear the log."""
        self.log_text.config(state="normal")
        self.log_text.delete("1.0", tk.END)
        self.log_text.config(state="disabled")


def run_gui():
    """Launch the GUI application."""
    root = tk.Tk()
    app = PhotoSorterGUI(root)
    root.mainloop()


if __name__ == "__main__":
    run_gui()

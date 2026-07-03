"""
Camera Service
Provides MJPEG streaming and photo capture with picamera2/picamera support and mock fallback.
"""

import logging
import os
import time

import numpy as np
import cv2

from backend.config_loader import load_config

logger = logging.getLogger(__name__)

# Attempt to import camera libraries
PICAMERA2_AVAILABLE = False
PICAMERA_AVAILABLE = False

try:
    from picamera2 import Picamera2
    PICAMERA2_AVAILABLE = True
except ImportError:
    Picamera2 = None

if not PICAMERA2_AVAILABLE:
    try:
        import picamera
        import picamera.array
        PICAMERA_AVAILABLE = True
    except ImportError:
        picamera = None

if not PICAMERA2_AVAILABLE and not PICAMERA_AVAILABLE:
    logger.warning("No camera library available - camera will run in mock mode")


class CameraService:
    """Singleton camera service with picamera2/picamera support and mock fallback."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        # Respect MOCK_CAMERA env var (set in .env for testing without hardware)
        self.mock_mode = os.getenv('MOCK_CAMERA', 'False').strip().lower() == 'true'
        self.camera = None
        self._camera_type = None
        self._running = False
        self._load_config()
        if not self.mock_mode:
            self._initialize_camera()
        else:
            logger.warning("Camera running in MOCK mode (MOCK_CAMERA=True)")
        self._initialized = True

    def _load_config(self):
        """Load camera configuration from config.yaml."""
        config = load_config()
        cam_config = config.get('camera', {})
        self.enabled = cam_config.get('enabled', True)
        self.width = cam_config.get('width', 240)
        self.height = cam_config.get('height', 192)
        self.framerate = cam_config.get('framerate', 30)
        self.display_rate = cam_config.get('display_rate', 10)
        self.jpeg_quality = cam_config.get('jpeg_quality', 80)
        self.flipped = cam_config.get('flipped', True)

    def _initialize_camera(self):
        """Try to initialize camera hardware; fall back to mock mode on failure."""
        if not self.enabled:
            logger.info("Camera disabled in config")
            self.mock_mode = True
            return

        if PICAMERA2_AVAILABLE:
            try:
                self.camera = Picamera2()
                camera_config = self.camera.create_video_configuration(
                    main={"size": (self.width, self.height), "format": "RGB888"}
                )
                self.camera.configure(camera_config)
                self._camera_type = 'picamera2'
                logger.info("Camera initialized (picamera2): %dx%d", self.width, self.height)
                return
            except Exception as e:
                logger.error("Failed to initialize picamera2: %s", e)
                self.camera = None

        if PICAMERA_AVAILABLE:
            try:
                self.camera = picamera.PiCamera()
                self.camera.resolution = (self.width, self.height)
                self.camera.framerate = self.framerate
                if self.flipped:
                    self.camera.rotation = 180
                # Give camera time to warm up
                time.sleep(0.5)
                self._camera_type = 'picamera'
                logger.info("Camera initialized (picamera v1): %dx%d", self.width, self.height)
                return
            except Exception as e:
                logger.error("Failed to initialize picamera: %s", e)
                self.camera = None

        logger.info("No camera hardware available - using mock mode")
        self.mock_mode = True

    def start(self):
        """Start the camera capture."""
        if self._running:
            return
        self._running = True
        if not self.mock_mode and self.camera is not None:
            try:
                if self._camera_type == 'picamera2':
                    self.camera.start()
                # picamera v1 doesn't need an explicit start for capture
                logger.info("Camera started")
            except Exception as e:
                logger.error("Failed to start camera: %s - switching to mock mode", e)
                self.camera = None
                self.mock_mode = True

    def stop(self):
        """Stop the camera capture."""
        if not self._running:
            return
        self._running = False
        if not self.mock_mode and self.camera is not None:
            try:
                if self._camera_type == 'picamera2':
                    self.camera.stop()
                elif self._camera_type == 'picamera':
                    self.camera.close()
                logger.info("Camera stopped")
            except Exception as e:
                logger.error("Error stopping camera: %s", e)

    def generate_frames(self):
        """
        Generator yielding MJPEG multipart boundaries with frame rate limiting.

        Yields:
            bytes: MJPEG frame data with multipart boundary headers.
        """
        self.start()
        try:
            while self._running:
                if self.mock_mode:
                    frame_bytes = self._generate_mock_frame()
                else:
                    frame_bytes = self._capture_hardware_frame()

                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' +
                    frame_bytes +
                    b'\r\n'
                )

                # Frame rate limiting
                time.sleep(1.0 / self.display_rate)
        except GeneratorExit:
            pass
        finally:
            self.stop()

    def capture_photo(self, filepath):
        """
        Capture a single frame and save as JPEG to the given filepath.

        Args:
            filepath: Path where the JPEG image should be saved.

        Returns:
            bool: True on success, False on failure.
        """
        try:
            if self.mock_mode:
                frame_bytes = self._generate_mock_frame()
            else:
                if not self._running:
                    self.start()
                frame_bytes = self._capture_hardware_frame()

            with open(filepath, 'wb') as f:
                f.write(frame_bytes)

            logger.info("Photo saved to %s", filepath)
            return True
        except Exception as e:
            logger.error("Failed to capture photo: %s", e)
            return False

    def _generate_mock_frame(self):
        """
        Generate a mock frame using OpenCV with 'MOCK CAMERA' text.

        Returns:
            bytes: JPEG-encoded frame data.
        """
        # Create blank dark gray image at configured resolution
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        frame[:] = (40, 40, 40)

        # Add text overlay
        text = "MOCK CAMERA"
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = self.width / 320.0  # Scale text to resolution
        thickness = max(1, int(font_scale * 2))

        text_size = cv2.getTextSize(text, font, font_scale, thickness)[0]
        text_x = (self.width - text_size[0]) // 2
        text_y = (self.height + text_size[1]) // 2

        cv2.putText(
            frame, text,
            (text_x, text_y),
            font, font_scale,
            (0, 255, 0),  # Green text
            thickness,
            cv2.LINE_AA
        )

        # Add timestamp
        timestamp = time.strftime("%H:%M:%S")
        ts_scale = font_scale * 0.5
        ts_thickness = max(1, int(ts_scale * 2))
        cv2.putText(
            frame, timestamp,
            (5, self.height - 10),
            font, ts_scale,
            (200, 200, 200),
            ts_thickness,
            cv2.LINE_AA
        )

        # Encode as JPEG
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality]
        _, jpeg_data = cv2.imencode('.jpg', frame, encode_params)
        return jpeg_data.tobytes()

    def _capture_hardware_frame(self):
        """
        Capture a frame from camera hardware.
        Supports both picamera2 and legacy picamera.
        Falls back to mock mode on hardware error.
        """
        try:
            if self._camera_type == 'picamera2':
                frame = self.camera.capture_array()
                if self.flipped:
                    frame = cv2.flip(frame, -1)
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            elif self._camera_type == 'picamera':
                import io
                stream = io.BytesIO()
                self.camera.capture(stream, format='jpeg', use_video_port=True)
                stream.seek(0)
                # Return JPEG directly - no need to re-encode
                return stream.read()

            encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.jpeg_quality]
            _, jpeg_data = cv2.imencode('.jpg', frame_bgr, encode_params)
            return jpeg_data.tobytes()
        except Exception as e:
            logger.error("Hardware camera error: %s - switching to mock mode", e)
            self.mock_mode = True
            self.camera = None
            return self._generate_mock_frame()


# Made with Bob

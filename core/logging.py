import logging
import hashlib
from typing import Optional

from .config import get_settings

settings = get_settings()

def get_hashed_ip(ip: Optional[str]) -> str:
    """
    Hashes an IP address with a salt. Returns 'unknown' if IP is not provided.
    """
    if not ip:
        return "unknown"

    # Use a per-deployment salt for hashing
    salted_ip = ip + settings.IP_SALT
    return hashlib.sha256(salted_ip.encode()).hexdigest()

def setup_logging():
    """
    Configures the application's logging.
    """
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    # You can add more handlers here, for example, to log to a file or a logging service.
    # For now, it logs to the console.

    # Example of a custom filter to add hashed IP to log records if available
    class HashedIpFilter(logging.Filter):
        def __init__(self, ip="unknown"):
            super().__init__()
            self.ip = ip

        def filter(self, record):
            record.hashed_ip = get_hashed_ip(self.ip)
            return True

    # This is just a conceptual example. The actual IP will be added via middleware.
    # The formatter would then need to be updated to include `%(hashed_ip)s`.
    # e.g. format="%(asctime)s - %(hashed_ip)s - %(name)s - %(levelname)s - %(message)s"

    logger = logging.getLogger("api")
    logger.info("Logging configured.")
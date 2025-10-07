import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from core.logging import get_hashed_ip

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Get client IP and hash it
        client_ip = request.client.host if request.client else "unknown"
        hashed_ip = get_hashed_ip(client_ip)

        # Log request details
        logger.info(
            f"Request: {request.method} {request.url.path}",
            extra={"hashed_ip": hashed_ip, "path": request.url.path, "method": request.method}
        )

        response = await call_next(request)

        process_time = time.time() - start_time

        # Log response details
        logger.info(
            f"Response: {response.status_code} in {process_time:.4f}s",
            extra={
                "hashed_ip": hashed_ip,
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "process_time": process_time
            }
        )

        return response
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from core.database import engine, Base
import models.user
import models.message
from api import auth, messaging
from core.logging import setup_logging
from api.middleware import LoggingMiddleware
from api.security_headers import SecurityHeadersMiddleware

# Setup logging
setup_logging()

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Add middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)


app.include_router(auth.router, prefix="/api/auth")
app.include_router(messaging.router, prefix="/api/messages")

# Mount static files
app.mount("/styles", StaticFiles(directory="styles"), name="styles")
app.mount("/scripts", StaticFiles(directory="scripts"), name="scripts")

templates = Jinja2Templates(directory=".")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/messenger", response_class=HTMLResponse)
async def messenger_page(request: Request):
    return templates.TemplateResponse("messenger.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
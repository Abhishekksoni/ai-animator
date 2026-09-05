import os
import re
import urllib.parse
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from models.models import Base

# By default, use local SQLite database with aiosqlite, or postgresql+asyncpg if DATABASE_URL is set
BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
DB_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DB_URL = f"sqlite+aiosqlite:///{DB_DIR}/animator.db"

def format_database_url(url: str) -> str:
    if not url:
        return DEFAULT_DB_URL
    url = url.strip().strip("'").strip('"')
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif not url.startswith("postgresql+asyncpg://") and not url.startswith("sqlite"):
        return DEFAULT_DB_URL
    
    # Safely handle special characters in password using regex
    if url.startswith("postgresql+asyncpg://"):
        pattern = re.compile(r'^(postgresql\+asyncpg:\/\/)([^:]+):(.+)@([^:/]+)(?::(\d+))?(\/.*)?$')
        match = pattern.match(url)
        if match:
            scheme, user, password, host, port, rest = match.groups()
            # If already percent-encoded, unquote first then quote_plus
            unquoted = urllib.parse.unquote(password)
            encoded_password = urllib.parse.quote_plus(unquoted)
            port_str = f":{port}" if port else ""
            rest_str = rest if rest else "/postgres"
            url = f"{scheme}{user}:{encoded_password}@{host}{port_str}{rest_str}"
            
    return url

DATABASE_URL = format_database_url(os.getenv("DATABASE_URL", DEFAULT_DB_URL))

def get_engine(url: str):
    try:
        return create_async_engine(
            url,
            echo=False,
            future=True,
            connect_args={"check_same_thread": False} if "sqlite" in url else {}
        )
    except Exception as e:
        print(f"Warning: Failed to create engine for {url} ({e}). Falling back to SQLite.")
        return create_async_engine(
            DEFAULT_DB_URL,
            echo=False,
            future=True,
            connect_args={"check_same_thread": False}
        )

engine = get_engine(DATABASE_URL)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def init_db():
    """Initializes database tables with fallback to SQLite if remote Postgres is unreachable."""
    global engine, AsyncSessionLocal
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database successfully initialized.")
    except Exception as e:
        print(f"Warning: Failed to connect to primary database ({e}). Falling back to local SQLite.")
        engine = create_async_engine(
            DEFAULT_DB_URL,
            echo=False,
            future=True,
            connect_args={"check_same_thread": False}
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Fallback SQLite database initialized successfully.")

async def get_db():
    """FastAPI Dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

import os
import urllib.parse
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from models.models import Base

# By default, use local SQLite database with aiosqlite, or postgresql+asyncpg if DATABASE_URL is set
DB_DIR = Path("/Users/abhisheksoni/ai-animator/storage")
DB_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DB_URL = f"sqlite+aiosqlite:///{DB_DIR}/animator.db"

def format_database_url(url: str) -> str:
    if not url:
        return DEFAULT_DB_URL
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Safely handle special characters in password if present
    if "postgresql+asyncpg://" in url:
        try:
            url_obj = urllib.parse.urlsplit(url)
            username = url_obj.username
            password = url_obj.password
            hostname = url_obj.hostname
            port = url_obj.port
            path = url_obj.path

            if password and ("&" in password or "$" in password or ")" in password or "%" in password):
                encoded_pass = urllib.parse.quote_plus(password)
                auth = f"{username}:{encoded_pass}" if username else encoded_pass
                netloc = f"{auth}@{hostname}"
                if port:
                    netloc += f":{port}"
                url = urllib.parse.urlunsplit((url_obj.scheme, netloc, path, url_obj.query, url_obj.fragment))
        except Exception:
            pass
            
    return url

DATABASE_URL = format_database_url(os.getenv("DATABASE_URL", DEFAULT_DB_URL))

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def init_db():
    """Initializes database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """FastAPI Dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

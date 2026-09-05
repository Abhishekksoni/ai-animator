import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from api.main import app
from db.session import init_db

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_models_list():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/models")
        assert res.status_code == 200
        data = res.json()
        assert "models" in data
        assert len(data["models"]) >= 3

@pytest.mark.asyncio
async def test_conversation_crud_and_message_generation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create conversation
        create_res = await ac.post("/api/conversations", json={"title": "Pythagoras Test"})
        assert create_res.status_code == 200
        conv = create_res.json()
        conv_id = conv["id"]
        assert conv["title"] == "Pythagoras Test"

        # List conversations
        list_res = await ac.get("/api/conversations")
        assert list_res.status_code == 200
        assert any(c["id"] == conv_id for c in list_res.json())

        # Send a prompt using Mock provider
        msg_res = await ac.post(
            f"/api/conversations/{conv_id}/messages",
            json={
                "content": "Explain the Pythagorean theorem visually",
                "provider": "mock"
            }
        )
        assert msg_res.status_code == 200
        msg_data = msg_res.json()
        assert msg_data["scene"]["status"] == "succeeded"
        assert msg_data["scene"]["video_url"] is not None
        assert msg_data["scene"]["version"] == 1

        # Fetch conversation details with messages and scene versions
        get_res = await ac.get(f"/api/conversations/{conv_id}")
        assert get_res.status_code == 200
        conv_detail = get_res.json()
        assert len(conv_detail["messages"]) == 2  # user + assistant
        assert len(conv_detail["scenes"]) == 1

        # Fetch scene code endpoint
        scene_id = conv_detail["scenes"][0]["id"]
        code_res = await ac.get(f"/api/scenes/{scene_id}/code")
        assert code_res.status_code == 200
        assert "class GenScene(Scene):" in code_res.json()["code"]

        # Clean up delete conversation
        del_res = await ac.delete(f"/api/conversations/{conv_id}")
        assert del_res.status_code == 200

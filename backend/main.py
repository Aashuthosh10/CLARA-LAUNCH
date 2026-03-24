"""Compatibility entrypoint for the CLARA backend."""

from backend.app.main import app


if __name__ == "__main__":
    import uvicorn

    from backend.config.settings import HOST, PORT

    uvicorn.run(app, host=HOST, port=PORT)

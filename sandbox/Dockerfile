# Lightweight sandboxed environment for rendering Manim scenes
FROM manimcommunity/manim:latest

USER root
WORKDIR /workspace

# Set security limits & environment
ENV MANIM_VERBOSITY=WARNING
ENV PYTHONUNBUFFERED=1

# Non-root user with limited permissions
USER manimuser

ENTRYPOINT ["manim"]
CMD ["--help"]

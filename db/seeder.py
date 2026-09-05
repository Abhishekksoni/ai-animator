import os
import shutil
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.models import Conversation, Message, Scene

logger = logging.getLogger("ai_animator.seeder")

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLE_ASSETS_DIR = BASE_DIR / "assets" / "sample_media"
DEFAULT_MEDIA_DIR = Path(os.getenv("MEDIA_DIR", str(BASE_DIR / "storage" / "media")))

SAMPLE_CONVERSATIONS = [
    {
        "id": "3001d5d3-ea88-40de-a6c6-f4420486a2a2",
        "title": "Create a 3-layer neural network visualization...",
        "messages": [
            {
                "id": "3001d5d3-msg-1",
                "role": "user",
                "content": "Create a 3-layer neural network visualization with animated signal flow and activations"
            },
            {
                "id": "3001d5d3-msg-2",
                "role": "assistant",
                "content": "I have generated and rendered your 3-layer neural network animation showing signal flow and node activations."
            }
        ],
        "scenes": [
            {
                "id": "636a6c2e-13d3-43f6-a374-776712b95e7d",
                "version": 1,
                "status": "succeeded",
                "video_url": "/media/3001d5d3-ea88-40de-a6c6-f4420486a2a2_v1_att1.mp4",
                "thumbnail_url": "/media/3001d5d3-ea88-40de-a6c6-f4420486a2a2_v1_att1.png",
                "render_duration_ms": 7807,
                "llm_provider": "gemini",
                "llm_model": "gemini-3.7-flash",
                "code": """from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Text("Neural Network Visualization", font_size=38, color=GOLD).to_edge(UP, buff=0.4)
        subtitle = Text("Activation Pulses & Signal Propagation", font_size=22, color=LIGHT_GRAY).next_to(title, DOWN, buff=0.15)
        self.play(Write(title), FadeIn(subtitle, shift=DOWN * 0.2))
        self.wait(0.3)

        layer_sizes = [3, 5, 2]
        x_coords = [-3.8, 0.0, 3.8]
        layer_colors = [TEAL, PURPLE_B, ORANGE]
        
        layer_nodes = []
        node_groups = []

        for size, x_pos, color in zip(layer_sizes, x_coords, layer_colors):
            nodes = []
            y_positions = np.linspace(1.8, -1.8, size)
            for y_pos in y_positions:
                node = Circle(
                    radius=0.32, 
                    color=color, 
                    fill_color=color, 
                    fill_opacity=0.15, 
                    stroke_width=2.5
                ).move_to([x_pos, y_pos, 0])
                nodes.append(node)
            layer_nodes.append(nodes)
            node_groups.append(VGroup(*nodes))

        connections_1_2 = []
        connections_2_3 = []
        edges_group = VGroup()

        for n1 in layer_nodes[0]:
            for n2 in layer_nodes[1]:
                line = Line(n1.get_center(), n2.get_center(), stroke_width=1.2, stroke_opacity=0.25, color=GRAY_A)
                connections_1_2.append(line)
                edges_group.add(line)

        for n2 in layer_nodes[1]:
            for n3 in layer_nodes[2]:
                line = Line(n2.get_center(), n3.get_center(), stroke_width=1.2, stroke_opacity=0.25, color=GRAY_A)
                connections_2_3.append(line)
                edges_group.add(line)

        lbl_input = Text("Input Layer", font_size=18, color=TEAL).next_to(node_groups[0], DOWN, buff=0.5)
        lbl_hidden = Text("Hidden Layer", font_size=18, color=PURPLE_B).next_to(node_groups[1], DOWN, buff=0.5)
        lbl_output = Text("Output Layer", font_size=18, color=ORANGE).next_to(node_groups[2], DOWN, buff=0.5)
        labels_group = VGroup(lbl_input, lbl_hidden, lbl_output)

        self.play(
            Create(edges_group, run_time=1.2),
            LaggedStart(*[Create(g) for g in node_groups], lag_ratio=0.25, run_time=1.2),
            Write(labels_group),
        )
        self.wait(0.5)

        self.play(*[n.animate.set_fill(TEAL, opacity=0.85).scale(1.1) for n in layer_nodes[0]], run_time=0.5)
        self.play(*[n.animate.scale(1/1.1) for n in layer_nodes[0]], run_time=0.3)

        pulses_1 = [Dot(radius=0.07, color=YELLOW) for _ in connections_1_2]
        edge_highlights_1 = [e.animate.set_stroke(color=YELLOW, opacity=0.8, width=2.5) for e in connections_1_2]

        self.play(
            *[MoveAlongPath(p, e) for p, e in zip(pulses_1, connections_1_2)],
            *edge_highlights_1,
            run_time=1.2,
            rate_func=smooth
        )

        edge_resets_1 = [e.animate.set_stroke(color=GRAY_A, opacity=0.25, width=1.2) for e in connections_1_2]
        self.play(
            *edge_resets_1,
            *[n.animate.set_fill(TEAL, opacity=0.2) for n in layer_nodes[0]],
            *[n.animate.set_fill(PURPLE_B, opacity=0.85).scale(1.1) for n in layer_nodes[1]],
            run_time=0.6
        )
        self.play(*[n.animate.scale(1/1.1) for n in layer_nodes[1]], run_time=0.3)

        for p in pulses_1:
            self.remove(p)

        pulses_2 = [Dot(radius=0.07, color=GOLD) for _ in connections_2_3]
        edge_highlights_2 = [e.animate.set_stroke(color=GOLD, opacity=0.8, width=2.5) for e in connections_2_3]

        self.play(
            *[MoveAlongPath(p, e) for p, e in zip(pulses_2, connections_2_3)],
            *edge_highlights_2,
            run_time=1.2,
            rate_func=smooth
        )

        edge_resets_2 = [e.animate.set_stroke(color=GRAY_A, opacity=0.25, width=1.2) for e in connections_2_3]
        self.play(
            *edge_resets_2,
            *[n.animate.set_fill(PURPLE_B, opacity=0.2) for n in layer_nodes[1]],
            layer_nodes[2][0].animate.set_fill(ORANGE, opacity=0.95).scale(1.2),
            layer_nodes[2][1].animate.set_fill(ORANGE, opacity=0.25),
            run_time=0.6
        )

        for p in pulses_2:
            self.remove(p)

        pred_label = Text("Prediction: Class 1", font_size=20, color=ORANGE).next_to(layer_nodes[2][0], RIGHT, buff=0.35)
        self.play(Write(pred_label))
        self.wait(1.0)
"""
            }
        ]
    },
    {
        "id": "b5011c12-4ccf-4bc0-b5c3-b0994c71297e",
        "title": "Explain the Pythagorean theorem visually with...",
        "messages": [
            {
                "id": "b5011c-msg-1",
                "role": "user",
                "content": "Explain the Pythagorean theorem visually with animated geometric squares on triangle sides"
            },
            {
                "id": "b5011c-msg-2",
                "role": "assistant",
                "content": "I have created the geometric visualization of the Pythagorean theorem: a² + b² = c²."
            }
        ],
        "scenes": [
            {
                "id": "104396be-21e9-41b7-8763-3eaa11c2e2da",
                "version": 1,
                "status": "succeeded",
                "video_url": "/media/b5011c12-4ccf-4bc0-b5c3-b0994c71297e_v2_att3.mp4",
                "thumbnail_url": "/media/b5011c12-4ccf-4bc0-b5c3-b0994c71297e_v2_att3.png",
                "render_duration_ms": 6400,
                "llm_provider": "gemini",
                "llm_model": "gemini-3.7-flash",
                "code": """from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Text("Pythagorean Theorem: a² + b² = c²", font_size=36, color=YELLOW).to_edge(UP)
        self.play(Write(title))

        a, b = 3.0, 4.0
        c = np.hypot(a, b)

        triangle = Polygon(
            ORIGIN, RIGHT * b, RIGHT * b + UP * a,
            color=WHITE, fill_color=BLUE_E, fill_opacity=0.5
        ).center().shift(DOWN * 0.5)

        lbl_a = Text("a = 3", font_size=24, color=RED).next_to(triangle, RIGHT)
        lbl_b = Text("b = 4", font_size=24, color=GREEN).next_to(triangle, DOWN)
        lbl_c = Text("c = 5", font_size=24, color=YELLOW).next_to(triangle, UP + LEFT)

        self.play(Create(triangle), Write(lbl_a), Write(lbl_b), Write(lbl_c))
        self.wait(1)
"""
            }
        ]
    },
    {
        "id": "f880af14-f1de-4ca1-8bbf-78d5c51b4dd8",
        "title": "Show a sine wave graph with...",
        "messages": [
            {
                "id": "f880af-msg-1",
                "role": "user",
                "content": "Show a sine wave graph with moving tangent line showing derivative is cosine"
            },
            {
                "id": "f880af-msg-2",
                "role": "assistant",
                "content": "Here is the animation displaying a sine wave with real-time derivative tangent tracking."
            }
        ],
        "scenes": [
            {
                "id": "73771c8d-3227-4626-80f4-6ee8cad34533",
                "version": 1,
                "status": "succeeded",
                "video_url": "/media/f880af14-f1de-4ca1-8bbf-78d5c51b4dd8_v1_att1.mp4",
                "thumbnail_url": "/media/f880af14-f1de-4ca1-8bbf-78d5c51b4dd8_v1_att1.png",
                "render_duration_ms": 5200,
                "llm_provider": "gemini",
                "llm_model": "gemini-3.7-flash",
                "code": """from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Text("Derivative of sin(x) is cos(x)", font_size=32, color=BLUE).to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[0, 2 * np.pi, np.pi / 2],
            y_range=[-1.5, 1.5, 1],
            x_length=8,
            y_length=4,
            axis_config={"include_tip": True}
        ).shift(DOWN * 0.2)
        
        x_label = Text("x", font_size=20).next_to(axes.x_axis.get_end(), RIGHT)
        y_label = Text("y", font_size=20).next_to(axes.y_axis.get_end(), UP)
        self.play(Create(axes), Write(x_label), Write(y_label))

        sine_graph = axes.plot(lambda x: np.sin(x), color=BLUE_B, stroke_width=4)
        self.play(Create(sine_graph))

        x_tracker = ValueTracker(0)

        dot = always_redraw(lambda: Dot(
            point=axes.c2p(x_tracker.get_value(), np.sin(x_tracker.get_value())),
            color=YELLOW
        ))

        tangent = always_redraw(lambda: TangentLine(
            sine_graph,
            alpha=np.clip(x_tracker.get_value() / (2 * np.pi), 0.001, 0.999),
            length=2,
            color=RED
        ))

        deriv_label = always_redraw(lambda: Text(
            f"Slope = {np.cos(x_tracker.get_value()):.2f}",
            font_size=24,
            color=RED
        ).to_corner(UR))

        self.add(dot, tangent, deriv_label)
        self.play(x_tracker.animate.set_value(2 * np.pi), run_time=5, rate_func=linear)
        
        final_text = Text("The slope matches cos(x)", font_size=26, color=GREEN).next_to(deriv_label, DOWN)
        self.play(Write(final_text))
        self.wait(1)
"""
            }
        ]
    },
    {
        "id": "aa2f258d-2c54-4a2b-b28c-d547bea16005",
        "title": "Create an animation showing a blue...",
        "messages": [
            {
                "id": "aa2f25-msg-1",
                "role": "user",
                "content": "Create an animation showing a blue circle transforming into a red square"
            },
            {
                "id": "aa2f25-msg-2",
                "role": "assistant",
                "content": "Rendered the shape transformation animation morphing the blue circle into a rotated red square."
            }
        ],
        "scenes": [
            {
                "id": "6803206e-3be7-494b-99f4-f8fcd61bb257",
                "version": 1,
                "status": "succeeded",
                "video_url": "/media/aa2f258d-2c54-4a2b-b28c-d547bea16005_v1_att1.mp4",
                "thumbnail_url": "/media/aa2f258d-2c54-4a2b-b28c-d547bea16005_v1_att1.png",
                "render_duration_ms": 3800,
                "llm_provider": "gemini",
                "llm_model": "gemini-3.7-flash",
                "code": """from manim import *

class GenScene(Scene):
    def construct(self):
        circle = Circle(radius=2, color=BLUE, fill_opacity=0.7)
        square = Square(side_length=3.5, color=RED, fill_opacity=0.7)
        
        title = Text("Shape Transformation", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))
        self.play(DrawBorderThenFill(circle), run_time=1.5)
        self.wait(0.5)
        self.play(Transform(circle, square), run_time=2)
        self.wait(0.5)
        self.play(circle.animate.rotate(PI / 4), run_time=1)
        self.wait(1)
"""
            }
        ]
    }
]

def ensure_sample_media_files(media_dir: Path):
    """Copies bundled sample videos and thumbnails from assets/sample_media to MEDIA_DIR if missing."""
    media_dir.mkdir(parents=True, exist_ok=True)
    if SAMPLE_ASSETS_DIR.exists():
        for asset_file in SAMPLE_ASSETS_DIR.glob("*.*"):
            dest_file = media_dir / asset_file.name
            if not dest_file.exists():
                try:
                    shutil.copy2(asset_file, dest_file)
                    logger.info(f"Copied sample asset {asset_file.name} to {dest_file}")
                except Exception as e:
                    logger.warning(f"Failed to copy sample asset {asset_file.name}: {e}")

async def seed_sample_animations(session: AsyncSession):
    """Seeds the 4 showcase sample conversations and scenes into the database if not present."""
    try:
        ensure_sample_media_files(DEFAULT_MEDIA_DIR)

        for sample_data in SAMPLE_CONVERSATIONS:
            conv_id = sample_data["id"]
            existing = await session.get(Conversation, conv_id)
            if not existing:
                conv = Conversation(
                    id=conv_id,
                    user_id=None,
                    title=sample_data["title"]
                )
                session.add(conv)
                await session.flush()

                for msg_data in sample_data["messages"]:
                    msg = Message(
                        id=msg_data["id"],
                        conversation_id=conv_id,
                        role=msg_data["role"],
                        content=msg_data["content"]
                    )
                    session.add(msg)

                for scene_data in sample_data["scenes"]:
                    scene = Scene(
                        id=scene_data["id"],
                        conversation_id=conv_id,
                        version=scene_data["version"],
                        code=scene_data["code"],
                        status=scene_data["status"],
                        video_url=scene_data["video_url"],
                        thumbnail_url=scene_data["thumbnail_url"],
                        render_duration_ms=scene_data["render_duration_ms"],
                        llm_provider=scene_data["llm_provider"],
                        llm_model=scene_data["llm_model"]
                    )
                    session.add(scene)

                await session.commit()
                logger.info(f"Seeded sample conversation: {sample_data['title']}")
    except Exception as e:
        logger.error(f"Error seeding sample animations: {e}")
        await session.rollback()

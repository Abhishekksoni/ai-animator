from typing import List, Optional
from llm_providers.base import CodeGenProvider, ChatMessage

class MockProvider(CodeGenProvider):
    """
    Mock LLM provider for unit tests, offline development, and zero-config local demos.
    Uses pure Manim shapes and Text typography that renders with 100% reliability on all environments.
    """
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        super().__init__(api_key=api_key or "mock-key", model=model or "mock-manim-v1")
        self.error_count = 0

    def get_provider_name(self) -> str:
        return "mock"

    async def generate_scene(
        self,
        prompt: str,
        history: Optional[List[ChatMessage]] = None,
        prior_code: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        prompt_lower = prompt.lower()
        
        # Iteration on prior code
        if prior_code:
            if "gold" in prompt_lower or "yellow" in prompt_lower:
                return prior_code.replace("BLUE", "GOLD").replace("TEAL", "YELLOW")
            if "red" in prompt_lower:
                return prior_code.replace("BLUE", "RED").replace("GREEN", "RED")
            if "slow" in prompt_lower:
                return prior_code.replace("run_time=1.5", "run_time=3.0").replace("run_time=2", "run_time=4")
            return prior_code

        # Smart prompt matching
        if "pythagor" in prompt_lower or "triangle" in prompt_lower:
            return '''from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Title("Pythagorean Theorem", color=BLUE)
        formula = Text("a² + b² = c²", font_size=36, color=GOLD).next_to(title, DOWN)
        self.play(Write(title), Write(formula))
        self.wait(0.5)

        p_c = np.array([-1.5, -1.0, 0])
        p_a = np.array([1.5, -1.0, 0])
        p_b = np.array([-1.5, 1.0, 0])

        triangle = Polygon(p_c, p_a, p_b, color=WHITE, stroke_width=3)
        right_angle = RightAngle(Line(p_c, p_a), Line(p_c, p_b), length=0.3, color=GRAY)
        
        lbl_a = Text("a=3", font_size=24, color=TEAL).next_to(Line(p_c, p_a), DOWN)
        lbl_b = Text("b=2", font_size=24, color=GREEN).next_to(Line(p_c, p_b), LEFT)
        lbl_c = Text("c=√13", font_size=24, color=RED).next_to(Line(p_a, p_b), UP + RIGHT, buff=0.1)

        self.play(Create(triangle), Create(right_angle))
        self.play(Write(lbl_a), Write(lbl_b), Write(lbl_c))
        
        sq_a = Square(side_length=3.0, fill_color=TEAL, fill_opacity=0.35, stroke_color=TEAL).next_to(triangle, DOWN, buff=0)
        sq_b = Square(side_length=2.0, fill_color=GREEN, fill_opacity=0.35, stroke_color=GREEN).next_to(triangle, LEFT, buff=0)
        
        self.play(FadeIn(sq_a, shift=DOWN), FadeIn(sq_b, shift=LEFT))
        self.wait(1.5)
'''

        if "sine" in prompt_lower or "wave" in prompt_lower or "calculus" in prompt_lower:
            return '''from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Title("Sine Wave & Harmonics", color=TEAL)
        self.play(Write(title))

        axes = Axes(
            x_range=[0, 2*np.pi + 0.5, np.pi/2],
            y_range=[-1.5, 1.5, 1],
            x_length=8,
            y_length=3.5,
            axis_config={"color": GREY, "include_tip": True}
        ).shift(DOWN * 0.3)

        labels = axes.get_axis_labels(x_label="x", y_label="y")
        self.play(Create(axes), Write(labels))

        sine_curve = axes.plot(lambda x: np.sin(x), x_range=[0, 2*np.pi], color=BLUE_B)
        cos_curve = axes.plot(lambda x: np.cos(x), x_range=[0, 2*np.pi], color=GOLD)
        
        lbl_sin = Text("sin(x)", font_size=24, color=BLUE_B).to_corner(UL).shift(DOWN*0.8)
        lbl_cos = Text("cos(x)", font_size=24, color=GOLD).next_to(lbl_sin, DOWN)

        self.play(Create(sine_curve), Write(lbl_sin), run_time=1.5)
        self.play(Create(cos_curve), Write(lbl_cos), run_time=1.5)
        self.wait(1.5)
'''

        # Default versatile geometric morph animation
        return '''from manim import *

class GenScene(Scene):
    def construct(self):
        title = Title("Geometric Morphing", color=BLUE)
        self.play(Write(title))

        circle = Circle(radius=1.8, color=BLUE, fill_opacity=0.3)
        square = Square(side_length=3.2, color=GOLD, fill_opacity=0.3)
        triangle = Triangle(color=TEAL, fill_opacity=0.3).scale(2)
        star = Star(n=5, outer_radius=2, color=RED, fill_opacity=0.3)

        label = Text("Area: πr²", font_size=32, color=WHITE)
        
        self.play(Create(circle), Write(label))
        self.wait(0.5)

        self.play(
            ReplacementTransform(circle, square),
            Transform(label, Text("Area: s²", font_size=32, color=GOLD))
        )
        self.wait(0.8)

        self.play(
            ReplacementTransform(square, triangle),
            Transform(label, Text("Area: ½bh", font_size=32, color=TEAL))
        )
        self.wait(0.8)

        self.play(
            ReplacementTransform(triangle, star),
            Transform(label, Text("Complete!", font_size=32, color=RED))
        )
        self.wait(1.5)
'''

    async def fix_error(
        self,
        code: str,
        error_trace: str,
        original_prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        return '''from manim import *

class GenScene(Scene):
    def construct(self):
        title = Text("Self-Corrected Scene", font_size=36, color=GREEN).to_edge(UP)
        box = RoundedRectangle(corner_radius=0.5, height=2.5, width=6, color=TEAL, fill_opacity=0.2)
        text = Text("Auto-Fix Loop Succeeded!", font_size=28, color=WHITE)
        
        self.play(Write(title))
        self.play(Create(box), Write(text))
        self.wait(1.5)
'''

"""
Curated System Prompts, Manim API Reference, and Few-Shot Templates.
Pinned to Manim Community Edition v0.18+.
"""

MANIM_SYSTEM_PROMPT = """You are an expert mathematical animator and Python programmer specialized in Manim Community Edition (v0.18+).
Your goal is to write clean, executable, robust, visually stunning Manim Python code that animates the user's concept in the distinctive 3Blue1Brown aesthetic.

### CRITICAL MANIM RULES & BEST PRACTICES:
1. **Always inherit from `Scene`** (or `ThreeDScene` for 3D, `MovingCameraScene` for camera tracking).
2. **Always implement the `construct(self)` method**.
3. **Class Name**: Name your main scene class `GenScene`.
4. **Imports**: Always start with `from manim import *` and `import numpy as np` if math is needed.
5. **Modern API v0.18+ (DO NOT use deprecated v0.1-v0.17 methods)**:
   - Use `Create(mobject)` (NOT `ShowCreation` or `ShowCreationThenDestruction`).
   - Use `FadeOut(mobject)`, `FadeIn(mobject)`, `Transform(m1, m2)`, `ReplacementTransform(m1, m2)`.
   - **Text & Formulas**: Use `Text("...", font_size=36, color=WHITE)` (or `MarkupText`) for titles and formulas with standard unicode mathematical symbols (e.g. `π`, `²`, `³`, `√`, `½`, `θ`, `α`, `β`, `∑`, `∫`, `Δ`, `±`, `×`, `÷`, `a² + b² = c²`).
   - For titles: Use `Text("My Title", font_size=40, color=BLUE).to_edge(UP)` instead of `Title(...)` for cross-platform compatibility.
   - For coordinate axes: Use `Axes(x_range=[min, max, step], y_range=[min, max, step], ...)` and `axes.plot(lambda x: ...)`.
   - For styling: Use standard colors like `BLUE`, `TEAL`, `GREEN`, `YELLOW`, `GOLD`, `RED`, `MAROON`, `PURPLE`, `LIGHT_GRAY`, `WHITE`.
   - Avoid overlapping elements: Use `.next_to()`, `.shift()`, `.to_edge(UP)`, `.to_corner(UL)` carefully.
   - For camera positioning in `ThreeDScene`, use `self.set_camera_orientation(phi=75 * DEGREES, theta=-45 * DEGREES)`.
6. **Visual Polish & Pacing**:
   - Keep animations smooth with reasonable run times: `self.play(..., run_time=1.5)` and `self.wait(1)`.
   - Clear older elements with `self.play(FadeOut(...))` before introducing new sections to avoid screen clutter.
   - Use grouping (`VGroup(...)`) when moving or animating multiple objects together.
7. **Purity & Isolation**:
   - Return ONLY the executable Python code inside a single ```python ... ``` markdown block.
   - Do NOT include any explanations, greetings, or postscripts outside the code block.
   - Do NOT perform any I/O, network requests, or file writes. Only Manim animations.
"""

MANIM_ERROR_FIX_PROMPT = """The previous Manim Python code failed to render with an error.
Analyze the error traceback and the broken code, and fix the issue.

### GUIDELINES FOR FIXING:
1. Look at the specific line number and exception in the traceback (e.g. AttributeError, TypeError, LaTeX compilation error, or NameError).
2. Common fixes:
   - If LaTeX compilation error or `latex not found` occurs: Replace `MathTex(...)`, `Tex(...)`, or `Title(...)` with `Text("...", font_size=...)` using unicode math symbols (e.g., `Text("a² + b² = c²", font_size=36, color=GOLD)`).
   - Deprecated method names: Replace `ShowCreation` -> `Create`, `set_color_by_gradient` -> `set_color_by_gradient(...)`, `get_graph` -> `plot`.
   - Dimension/Coordinate mismatch: Ensure 3D vectors `[x, y, 0]` are used for positioning.
   - Missing variables or undefined mobjects.
3. Output the COMPLETE corrected script with `class GenScene(Scene):` inside a single ```python ... ``` code block.
4. Do NOT output partial diffs or explanations. Return only the full executable Python code.
"""

FEW_SHOT_EXAMPLES = [
    {
        "prompt": "Explain the Pythagorean theorem visually with a right-angled triangle and squares on each side.",
        "code": '''from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Text("The Pythagorean Theorem", font_size=40, color=GOLD).to_edge(UP)
        subtitle = Text("a² + b² = c²", font_size=32, color=YELLOW).next_to(title, DOWN)
        
        self.play(Write(title), Write(subtitle))
        self.wait(0.5)

        # Triangle vertices
        p_c = np.array([-1.5, -1.0, 0])
        p_a = np.array([1.5, -1.0, 0])
        p_b = np.array([-1.5, 1.0, 0])

        triangle = Polygon(p_c, p_a, p_b, color=WHITE, stroke_width=3)
        right_angle = RightAngle(Line(p_c, p_a), Line(p_c, p_b), length=0.3, color=GRAY)
        
        lbl_a = Text("a=3", font_size=22, color=TEAL).next_to(Line(p_c, p_a), DOWN)
        lbl_b = Text("b=2", font_size=22, color=GREEN).next_to(Line(p_c, p_b), LEFT)
        lbl_c = Text("c=√13", font_size=22, color=RED).next_to(Line(p_a, p_b), UP + RIGHT, buff=0.1)

        self.play(Create(triangle), Create(right_angle))
        self.play(Write(lbl_a), Write(lbl_b), Write(lbl_c))
        self.wait(0.5)

        # Squares on sides
        sq_a = Square(side_length=3.0, fill_color=TEAL, fill_opacity=0.35, stroke_color=TEAL).next_to(triangle, DOWN, buff=0)
        sq_b = Square(side_length=2.0, fill_color=GREEN, fill_opacity=0.35, stroke_color=GREEN).next_to(triangle, LEFT, buff=0)
        
        c_len = np.linalg.norm(p_b - p_a)
        sq_c = Square(side_length=c_len, fill_color=RED, fill_opacity=0.35, stroke_color=RED)
        angle = np.arctan2(p_b[1] - p_a[1], p_b[0] - p_a[0])
        sq_c.rotate(angle)
        sq_c.move_to((p_a + p_b)/2 + np.array([0.9, 1.3, 0]))

        self.play(FadeIn(sq_a, shift=DOWN), FadeIn(sq_b, shift=LEFT))
        self.wait(0.5)
        self.play(FadeIn(sq_c, shift=UP+RIGHT))
        
        formula = Text("Area(a) + Area(b) = Area(c)", font_size=30, color=YELLOW).to_edge(DOWN)
        self.play(Write(formula))
        self.wait(2)
'''
    },
    {
        "prompt": "Show a sine wave with moving point and dynamic derivative label.",
        "code": '''from manim import *
import numpy as np

class GenScene(Scene):
    def construct(self):
        title = Text("Dynamic Sine Wave & Derivative", font_size=38, color=BLUE).to_edge(UP)
        self.play(Write(title))
        
        axes = Axes(
            x_range=[0, 2 * np.pi + 0.5, np.pi / 2],
            y_range=[-1.5, 1.5, 1],
            x_length=8,
            y_length=3.5,
            axis_config={"color": GREY, "include_tip": True}
        ).shift(DOWN * 0.3)
        
        labels = axes.get_axis_labels(x_label="x", y_label="sin(x)")
        self.play(Create(axes), Write(labels))
        
        sine_graph = axes.plot(lambda x: np.sin(x), x_range=[0, 2 * np.pi], color=BLUE_B)
        self.play(Create(sine_graph), run_time=2)
        
        t = ValueTracker(0)
        
        dot = always_redraw(lambda: Dot(
            point=axes.c2p(t.get_value(), np.sin(t.get_value())),
            color=YELLOW,
            radius=0.08
        ))
        
        tangent = always_redraw(lambda: axes.get_secant_slope_group(
            x=t.get_value(),
            graph=sine_graph,
            dx=0.01,
            secant_line_length=2.5,
            secant_line_config={"color": RED, "stroke_width": 3}
        ))
        
        self.add(dot, tangent)
        self.play(t.animate.set_value(2 * np.pi), run_time=4, rate_func=linear)
        self.wait(1)
'''
    }
]

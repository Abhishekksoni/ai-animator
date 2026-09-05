import ast
from typing import Tuple, Optional, List

FORBIDDEN_MODULES = {
    "os", "sys", "subprocess", "socket", "shutil", "urllib",
    "requests", "http", "ftplib", "telnetlib", "pickle", "pty",
    "ctypes", "multiprocessing", "threading", "signal", "posix"
}

FORBIDDEN_FUNCTIONS = {
    "eval", "exec", "compile", "open", "input", "__import__",
    "globals", "locals", "getattr", "setattr", "delattr"
}

class SecurityLintError(Exception):
    pass

class ManimASTLinter:
    """
    Validates Python AST for safety and ensures required Manim Scene structure.
    """

    @staticmethod
    def validate_code(code: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validates code safety and structure.
        Returns: (is_valid, scene_class_name, error_message)
        """
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return False, None, f"SyntaxError at line {e.lineno}: {e.msg}"
        except Exception as e:
            return False, None, f"Parsing error: {str(e)}"

        # Check for forbidden imports and function calls
        scene_classes: List[str] = []

        for node in ast.walk(tree):
            # Check imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root_mod = alias.name.split(".")[0]
                    if root_mod in FORBIDDEN_MODULES:
                        return False, None, f"Security Violation: Forbidden module import '{root_mod}'"

            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    root_mod = node.module.split(".")[0]
                    if root_mod in FORBIDDEN_MODULES:
                        return False, None, f"Security Violation: Forbidden from-import '{node.module}'"

            # Check function calls
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in FORBIDDEN_FUNCTIONS:
                        return False, None, f"Security Violation: Forbidden function call '{node.func.id}()'"

            # Look for Scene class definitions
            elif isinstance(node, ast.ClassDef):
                # Check base classes
                for base in node.bases:
                    base_id = ""
                    if isinstance(base, ast.Name):
                        base_id = base.id
                    elif isinstance(base, ast.Attribute):
                        base_id = base.attr

                    if any(valid in base_id for valid in ["Scene", "ThreeDScene", "MovingCameraScene", "VectorScene", "LinearTransformationScene"]):
                        # Check if construct method exists
                        has_construct = any(
                            isinstance(item, ast.FunctionDef) and item.name == "construct"
                            for item in node.body
                        )
                        if has_construct:
                            scene_classes.append(node.name)

        if not scene_classes:
            return False, None, "Structural Error: No class inheriting from Scene with a construct(self) method was found."

        # Preferred class name: GenScene or the first valid scene class
        chosen_class = "GenScene" if "GenScene" in scene_classes else scene_classes[0]
        return True, chosen_class, None

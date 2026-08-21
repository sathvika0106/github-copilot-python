from flask import Flask, jsonify, render_template, request
import sudoku_logic


app = Flask(__name__)

# Stores the puzzle currently being played.
GAME_STATE = {
    "puzzle": None,
    "solution": None,
    "difficulty": None,
}


ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}


def store_game(puzzle, solution, difficulty):
    """Store the currently active Sudoku game."""
    GAME_STATE["puzzle"] = puzzle
    GAME_STATE["solution"] = solution
    GAME_STATE["difficulty"] = difficulty


def get_active_solution():
    """Return the current solution or None when no game exists."""
    return GAME_STATE.get("solution")


def validate_board(board):
    """
    Validate the basic structure of a Sudoku board.

    The board must contain exactly 9 rows, each containing
    exactly 9 integer values between 0 and 9.
    """
    if not isinstance(board, list) or len(board) != sudoku_logic.SIZE:
        return False

    for row in board:
        if not isinstance(row, list) or len(row) != sudoku_logic.SIZE:
            return False

        for value in row:
            if isinstance(value, bool) or not isinstance(value, int):
                return False

            if value < 0 or value > 9:
                return False

    return True


def generate_game(difficulty=None, clues=None):
    """Generate a Sudoku puzzle using the requested configuration."""
    if difficulty is not None:
        normalized = difficulty.strip().lower()

        if normalized not in ALLOWED_DIFFICULTIES:
            raise ValueError(
                "Difficulty must be easy, medium, or hard."
            )

        return (
            sudoku_logic.generate_puzzle_for_difficulty(normalized),
            normalized,
        )

    if clues is None:
        clues = 35

    try:
        clues = int(clues)
    except (TypeError, ValueError):
        raise ValueError("Clues must be a valid integer.")

    if not 17 <= clues <= 81:
        raise ValueError("Clues must be between 17 and 81.")

    return sudoku_logic.generate_puzzle(clues), None


@app.route("/")
def index():
    """Render the Sudoku game."""
    return render_template("index.html")


@app.route("/new")
def new_game():
    """Generate and return a new Sudoku puzzle."""
    difficulty = request.args.get("difficulty")

    try:
        if difficulty is not None:
            generated, selected_difficulty = generate_game(
                difficulty=difficulty
            )
        else:
            clues = request.args.get("clues", 35)
            generated, selected_difficulty = generate_game(clues=clues)

        puzzle, solution = generated

        store_game(
            puzzle=puzzle,
            solution=solution,
            difficulty=selected_difficulty,
        )

        return jsonify({"puzzle": puzzle})

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/check", methods=["POST"])
def check_solution():
    """Compare the submitted board with the active Sudoku solution."""
    solution = get_active_solution()

    if solution is None:
        return jsonify({"error": "No game in progress."}), 400

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"error": "Request must contain JSON data."}), 400

    board = data.get("board")

    if not validate_board(board):
        return jsonify({
            "error": "Board must be a valid 9x9 grid containing values from 0 to 9."
        }), 400

    incorrect_cells = []

    for row_index in range(sudoku_logic.SIZE):
        for col_index in range(sudoku_logic.SIZE):
            if board[row_index][col_index] != solution[row_index][col_index]:
                incorrect_cells.append([row_index, col_index])

    return jsonify({"incorrect": incorrect_cells})


if __name__ == "__main__":
    app.run(debug=True)
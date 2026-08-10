import os
import sys
import random
import pytest

# Ensure the `starter` package directory is importable when running tests from the repo root
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app import app as flask_app
from sudoku_logic import (
    create_empty_board,
    deep_copy,
    get_clues_for_difficulty,
    generate_puzzle,
    generate_puzzle_for_difficulty,
    is_safe,
    fill_board,
    count_solutions,
    EMPTY,
    SIZE,
)


def count_non_empty(board):
    return sum(1 for r in board for c in r if c != EMPTY)


def check_board_valid(board):
    # rows
    for r in board:
        assert set(r) == set(range(1, SIZE + 1))
    # cols
    for c in range(SIZE):
        col = [board[r][c] for r in range(SIZE)]
        assert set(col) == set(range(1, SIZE + 1))
    # boxes
    for br in range(0, SIZE, 3):
        for bc in range(0, SIZE, 3):
            vals = []
            for r in range(3):
                for c in range(3):
                    vals.append(board[br + r][bc + c])
            assert set(vals) == set(range(1, SIZE + 1))


def test_create_empty_board():
    board = create_empty_board()
    assert len(board) == SIZE
    for row in board:
        assert len(row) == SIZE
        assert all(cell == EMPTY for cell in row)


def test_deep_copy_independent():
    board = create_empty_board()
    copy_board = deep_copy(board)
    board[0][0] = 9
    assert copy_board[0][0] == EMPTY


def test_is_safe_checks_row_col_box():
    board = create_empty_board()
    board[0][0] = 5
    # same row
    assert not is_safe(board, 0, 1, 5)
    # same column
    assert not is_safe(board, 1, 0, 5)
    # same 3x3 box
    assert not is_safe(board, 1, 1, 5)
    # far away is safe
    assert is_safe(board, 4, 4, 5)


def test_fill_board_generates_complete_valid_board():
    random.seed(0)
    board = create_empty_board()
    assert fill_board(board)
    # no empty cells
    assert count_non_empty(board) == SIZE * SIZE
    check_board_valid(board)


def test_generate_puzzle_returns_puzzle_and_solution_with_correct_clues():
    random.seed(0)
    clues = 35
    puzzle, solution = generate_puzzle(clues=clues)
    # solution is complete
    assert count_non_empty(solution) == SIZE * SIZE
    # puzzle has exactly 'clues' non-empty cells
    assert count_non_empty(puzzle) == clues


def test_get_clues_for_difficulty_easy():
    assert get_clues_for_difficulty('easy') == 45


def test_get_clues_for_difficulty_medium():
    assert get_clues_for_difficulty('medium') == 35


def test_get_clues_for_difficulty_hard():
    assert get_clues_for_difficulty('hard') == 30


def test_get_clues_for_difficulty_is_case_insensitive():
    assert get_clues_for_difficulty('  HaRD  ') == 30


def test_get_clues_for_difficulty_invalid_raises_value_error():
    with pytest.raises(ValueError):
        get_clues_for_difficulty('unknown')


def test_generate_puzzle_for_difficulty_easy():
    random.seed(0)
    puzzle, solution = generate_puzzle_for_difficulty('easy')
    assert count_non_empty(puzzle) == 45
    assert count_non_empty(solution) == SIZE * SIZE
    assert count_solutions(puzzle, limit=2) == 1


def test_generate_puzzle_for_difficulty_medium():
    random.seed(0)
    puzzle, solution = generate_puzzle_for_difficulty('medium')
    assert count_non_empty(puzzle) == 35
    assert count_non_empty(solution) == SIZE * SIZE
    assert count_solutions(puzzle, limit=2) == 1


def test_generate_puzzle_for_difficulty_hard():
    random.seed(0)
    puzzle, solution = generate_puzzle_for_difficulty('hard')
    assert count_non_empty(puzzle) == 30
    assert count_non_empty(solution) == SIZE * SIZE
    assert count_solutions(puzzle, limit=2) == 1


def test_new_route_invalid_difficulty_returns_400():
    client = flask_app.test_client()
    response = client.get('/new?difficulty=invalid')
    assert response.status_code == 400
    assert response.is_json
    assert 'error' in response.get_json()


def test_count_solutions_returns_one_for_unique_puzzle():
    board = [
        [5, 1, 7, 6, 0, 0, 0, 3, 4],
        [2, 8, 9, 0, 0, 4, 0, 0, 0],
        [3, 4, 6, 2, 0, 5, 0, 9, 0],
        [6, 0, 2, 0, 0, 0, 0, 1, 0],
        [0, 3, 8, 0, 0, 6, 0, 4, 7],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 9, 0, 0, 0, 0, 0, 7, 8],
        [7, 0, 3, 4, 0, 0, 5, 6, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]
    assert count_solutions(board, limit=2) == 1


def test_count_solutions_returns_two_for_multiple_solutions():
    board = [
        [0, 0, 0, 0, 0, 0, 1, 2, 3],
        [0, 0, 0, 0, 0, 0, 4, 5, 6],
        [0, 0, 0, 0, 0, 0, 7, 8, 9],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 2, 3, 0, 0, 0, 0, 0, 0],
        [4, 5, 6, 0, 0, 0, 0, 0, 0],
        [7, 8, 9, 0, 0, 0, 0, 0, 0],
    ]
    assert count_solutions(board, limit=2) == 2


def test_count_solutions_returns_zero_for_invalid_board():
    board = create_empty_board()
    board[0][0] = 1
    board[0][1] = 1
    assert count_solutions(board, limit=2) == 0


def test_generate_puzzle_has_exactly_one_solution():
    random.seed(0)
    puzzle, solution = generate_puzzle(clues=35)
    assert count_solutions(puzzle, limit=2) == 1


def test_generate_puzzle_preserves_requested_clues():
    random.seed(0)
    clues = 35
    puzzle, solution = generate_puzzle(clues=clues)
    assert count_non_empty(puzzle) == clues

import os
import sys
import random

# Ensure the `starter` package directory is importable when running tests from the repo root
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from sudoku_logic import (
    create_empty_board,
    deep_copy,
    is_safe,
    fill_board,
    generate_puzzle,
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

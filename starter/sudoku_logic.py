import copy
import random

SIZE = 9
EMPTY = 0

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board, limit=2):
    def board_is_valid():
        for row in range(SIZE):
            for col in range(SIZE):
                value = board[row][col]
                if value != EMPTY:
                    board[row][col] = EMPTY
                    if not is_safe(board, row, col, value):
                        board[row][col] = value
                        return False
                    board[row][col] = value
        return True

    if not board_is_valid():
        return 0

    solution_count = 0

    def find_empty_cell():
        for r in range(SIZE):
            for c in range(SIZE):
                if board[r][c] == EMPTY:
                    return r, c
        return None

    def backtrack():
        nonlocal solution_count
        if solution_count >= limit:
            return

        empty_pos = find_empty_cell()
        if empty_pos is None:
            solution_count += 1
            return

        row, col = empty_pos
        for candidate in range(1, SIZE + 1):
            if is_safe(board, row, col, candidate):
                board[row][col] = candidate
                backtrack()
                board[row][col] = EMPTY
                if solution_count >= limit:
                    return

    backtrack()
    return solution_count


def remove_cells(board, clues):
    current_clues = sum(1 for row in board for cell in row if cell != EMPTY)
    target_removals = current_clues - clues
    if target_removals <= 0:
        return

    positions = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(positions)
    removed = 0
    progress = True

    while removed < target_removals and progress:
        progress = False
        for row, col in positions:
            if board[row][col] == EMPTY:
                continue

            original = board[row][col]
            board[row][col] = EMPTY
            if count_solutions(board, limit=2) == 1:
                removed += 1
                progress = True
                if removed >= target_removals:
                    break
            else:
                board[row][col] = original

        if not progress:
            break

        random.shuffle(positions)


def generate_puzzle(clues=35):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    remove_cells(board, clues)
    puzzle = deep_copy(board)
    return puzzle, solution

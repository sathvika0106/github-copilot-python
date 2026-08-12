# Sudoku Game — Flask + JavaScript

A modern, interactive Sudoku game built with **Python Flask, HTML5, CSS3, and JavaScript**.

This project started as a simple Flask-based Sudoku application and was progressively refactored using **GitHub Copilot** to improve puzzle generation, validation, user experience, maintainability, and gameplay features.

The project was developed incrementally through multiple milestones, with automated testing and Git commits used to validate major changes.

---

## Features

### Sudoku Gameplay

* 9×9 Sudoku board
* Valid Sudoku solution generation
* Randomized puzzle generation
* Unique-solution validation
* Prefilled cells are locked
* Solution checking
* Incorrect cells are highlighted
* Immediate invalid-input feedback
* Responsive board layout
* Visual separation of 3×3 Sudoku blocks

### Difficulty Levels

Players can select between three difficulty levels:

| Difficulty | Clues |
| ---------- | ----: |
| Easy       |    45 |
| Medium     |    35 |
| Hard       |    30 |

Each difficulty level determines how many clues remain in the generated puzzle.

Every generated puzzle is checked to ensure that it has exactly **one valid solution**.

Difficulty values are normalized before lookup, so inputs such as:

```text
easy
Easy
  HaRD
```

are handled correctly.

Unsupported difficulty values return an appropriate error instead of silently falling back to another difficulty.

---

## Timer

The game includes a live client-side timer.

The timer:

* Starts after a puzzle is successfully loaded
* Displays elapsed time in `MM:SS` format
* Resets when a new game starts
* Continues while the player is solving
* Stops when the puzzle is solved
* Stores the final completion time
* Makes the completion time available to the leaderboard

Game flow:

```text
New Game
   ↓
Puzzle loads
   ↓
Timer starts
   ↓
Player solves puzzle
   ↓
Correct solution
   ↓
Timer stops
   ↓
Completion time recorded
```

---

## Hint System

The Hint feature provides one clue at a time.

When the player requests a hint:

1. The application finds an empty editable cell.
2. Candidate values are tested against the current game state.
3. The correct value is identified.
4. The value is inserted into the cell.
5. The hinted cell is locked.
6. The cell receives a distinct visual style.
7. The hint counter is incremented.

Hinted cells are visually different from the original prefilled cells.

The hint counter is reset whenever a new game begins.

---

## Top 10 Leaderboard

The game includes a client-side Top 10 leaderboard.

Each score contains:

* Player name
* Completion time in seconds
* Formatted completion time
* Difficulty
* Number of hints used
* Timestamp

Example:

```javascript
{
    name: "Player",
    timeSeconds: 125,
    timeFormatted: "02:05",
    difficulty: "medium",
    hintsUsed: 1,
    ts: 1234567890
}
```

Scores are:

* Sorted by fastest completion time
* Sorted by timestamp when completion times are equal
* Limited to the fastest 10 scores
* Stored in browser `localStorage`
* Restored after refreshing the page

The leaderboard can also be cleared using the **Clear Leaderboard** button.

---

## Score Saving

After successfully completing a Sudoku puzzle, the player receives a score-saving dialog.

The player can enter their name and save:

* Player name
* Completion time
* Difficulty
* Number of hints used

The application prevents duplicate score submissions for the same completed game.

---

## Dark Mode

The game supports both:

* Light Mode
* Dark Mode

A theme toggle allows the player to switch between the two modes.

The selected theme is stored in browser `localStorage` and restored when the application is opened again.

Dark mode includes dedicated styling for:

* Sudoku cells
* Incorrect cells
* Hinted cells
* Buttons
* Timer
* Leaderboard
* Score-saving modal
* Input controls

Incorrect cells remain clearly visible in dark mode using a contrasting red background and border.

---

## Immediate Input Validation

The game provides immediate feedback when a player enters an invalid Sudoku value.

An entered value can be detected as invalid when it conflicts with another value in the same:

* Row
* Column
* 3×3 box

Invalid cells are visually highlighted so the player can correct mistakes while solving.

---

## User Interface

The interface includes:

* Difficulty selector
* New Game button
* Check Solution button
* Hint button
* Hint counter
* Game timer
* Dark/Light mode toggle
* Sudoku board
* Top 10 leaderboard
* Clear Leaderboard button
* Score-saving modal
* User feedback messages

The interface is designed to remain usable on both desktop and smaller mobile-sized screens.

---

# Technologies Used

## Backend

* Python 3
* Flask

## Frontend

* HTML5
* CSS3
* JavaScript

## Testing

* Pytest

## Browser Storage

* Web Storage API
* `localStorage`

---

# Project Structure

```text
github-copilot-python/
│
└── starter/
    │
    ├── app.py
    ├── sudoku_logic.py
    ├── requirements.txt
    ├── pytest.ini
    ├── README.md
    │
    ├── templates/
    │   └── index.html
    │
    ├── static/
    │   ├── main.js
    │   └── styles.css
    │
    ├── tests/
    │   └── test_sudoku_logic.py
    │
    └── Screenshots/
        ├── copilot_timer_plan.png
        ├── timer_running.png
        ├── copilot_hint_plan.png
        ├── copilot_hint_implementation.png
        ├── Hint_button_use.png
        ├── copilot_scoreboard_plan.png
        ├── Checking_Difficulty.png
        ├── Checking_Leaderboard.png
        └── Checking_Localstorage_persistance.png
```

---

# Installation

## 1. Clone the Repository

```bash
git clone <your-repository-url>
```

Navigate into the project:

```bash
cd github-copilot-python/starter
```

---

## 2. Create a Virtual Environment

### Windows

```bash
python -m venv .venv
```

Activate it:

```bash
.venv\Scripts\activate
```

### Git Bash

```bash
source .venv/Scripts/activate
```

---

## 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Run the Flask Application

```bash
python app.py
```

---

## 5. Open the Application

Open:

```text
http://127.0.0.1:5000
```

in a modern web browser.

---

# How to Play

1. Select a difficulty level.
2. Click **New Game**.
3. The Sudoku puzzle will load and the timer will start.
4. Fill the empty cells with numbers from 1 to 9.
5. Invalid entries are highlighted immediately.
6. Use **Check Solution** to check the current puzzle state.
7. Use **Hint** if assistance is needed.
8. The hinted cell is automatically filled and locked.
9. Complete the entire Sudoku puzzle.
10. When the solution is correct, the timer stops.
11. The completion time and hints used are displayed.
12. Enter your name to save the result.
13. Your score can appear in the Top 10 leaderboard.

---

# Sudoku Logic

The Sudoku generator works in two major stages.

## 1. Generate a Complete Sudoku Solution

The application begins with an empty 9×9 board.

A recursive backtracking algorithm fills the board.

Candidate numbers are shuffled to introduce randomness.

Each candidate is checked against:

* Current row
* Current column
* Current 3×3 box

Only safe values are placed.

The process continues until the entire board contains a valid Sudoku solution.

---

## 2. Generate the Puzzle

After generating a complete solution:

1. The solution is copied.
2. Cells are progressively removed.
3. Each attempted removal is tested.
4. The application counts the number of possible solutions.
5. A cell is removed only if the puzzle still has exactly one solution.

This ensures that the generated puzzle remains solvable with a unique solution.

---

## Unique Solution Validation

The solution counter uses:

```text
count_solutions(board, limit=2)
```

The search stops as soon as two solutions are found.

The generator only needs to distinguish between:

```text
0 solutions
1 solution
2 or more solutions
```

Therefore, searching beyond two solutions is unnecessary and would increase computation time.

---

# Difficulty System

Difficulty is centralized in `sudoku_logic.py`.

```python
DIFFICULTY_MAP = {
    "easy": 45,
    "medium": 35,
    "hard": 30,
}
```

The application resolves the selected difficulty into a clue count.

```text
Easy
  ↓
45 clues

Medium
  ↓
35 clues

Hard
  ↓
30 clues
```

The existing:

```python
generate_puzzle(clues=35)
```

behavior remains available for compatibility with existing code and tests.

Difficulty-specific generation uses the same puzzle-generation and unique-solution validation logic.

---

# Timer Implementation

The timer is implemented on the client side using JavaScript.

Timer state includes:

* Timer interval
* Start timestamp
* Elapsed seconds
* Running state
* Final completion time

The timer is reset before a new puzzle is requested.

It starts only after the puzzle has successfully loaded.

When the solution is completely correct, the timer is stopped and the final elapsed time is retained for score submission.

---

# Hint Implementation

The Hint feature works with the existing game API.

The application:

1. Finds the first available empty editable cell.
2. Builds the current board state.
3. Tests possible values for the selected cell.
4. Uses the existing `/check` endpoint to determine whether the candidate is correct.
5. Applies the correct value.
6. Disables the cell.
7. Marks it with the `hinted` CSS class.
8. Increments the hint counter.

Only one cell is revealed per Hint request.

The hint operation also prevents multiple simultaneous hint requests.

---

# Leaderboard Implementation

Leaderboard data is stored in:

```text
sudokuTopScores
```

inside browser `localStorage`.

The leaderboard:

1. Loads existing scores.
2. Validates the stored data.
3. Adds a new score.
4. Sorts scores by completion time.
5. Uses timestamp as a tie-breaker.
6. Keeps only the fastest 10 scores.
7. Saves the updated list back to `localStorage`.
8. Re-renders the leaderboard.

The leaderboard is therefore persistent across browser refreshes without requiring a database.

---

# Dark Mode Implementation

The application uses a CSS class-based theme:

```text
body.dark-mode
```

The JavaScript toggles the class when the user selects Dark Mode or Light Mode.

The selected theme is stored in:

```text
sudokuTheme
```

in browser `localStorage`.

When the page loads, the saved theme is restored.

Dark mode also includes specific styles for invalid and incorrect cells so that errors remain clearly visible against the dark background.

---

# API Routes

## `GET /`

Loads the Sudoku game interface.

---

## `GET /new`

Creates a new Sudoku puzzle.

Difficulty can be supplied using a query parameter:

```text
/new?difficulty=easy
/new?difficulty=medium
/new?difficulty=hard
```

The endpoint returns the generated puzzle.

The existing clue-based generation behavior remains available through the backend logic.

---

## `POST /check`

Checks the player's current board against the generated solution.

The request contains the current Sudoku board.

Example:

```json
{
    "board": [
        [5, 3, 0, 0, 7, 0, 0, 0, 0]
    ]
}
```

The response identifies incorrect cells.

Example:

```json
{
    "incorrect": [
        [0, 2],
        [4, 7]
    ]
}
```

If the submitted board is completely correct:

```json
{
    "incorrect": []
}
```

---

# Error Handling

The application handles common errors including:

* Invalid difficulty values
* Missing game state
* Failed puzzle requests
* Failed hint requests
* Invalid leaderboard data
* Local storage failures
* Network failures during client-side requests

User-facing messages are displayed when appropriate instead of silently failing.

Invalid difficulty requests are returned with an HTTP `400` response.

---

# Responsive Design

The interface includes responsive styling for:

* Sudoku board
* Controls
* Timer
* Hint display
* Leaderboard
* Score-saving modal

The application is designed to work across:

* Desktop browsers
* Laptop screens
* Tablet-sized screens
* Mobile-sized screens

---

# Accessibility and UX

The project includes several accessibility and usability improvements:

* Semantic HTML elements
* Labels for form controls
* ARIA attributes for the score-saving dialog
* Live feedback areas
* Distinct visual states for incorrect and hinted cells
* Clear button labels
* Responsive layout
* High-contrast dark-mode error styling

Further accessibility improvements could include full keyboard navigation and modal focus trapping.

---

# Testing

The project uses **Pytest** for automated backend testing.

Run the test suite with:

```bash
python -m pytest -v
```

Current test result:

```text
19 passed
```

The test suite covers:

* Empty board creation
* Deep-copy behavior
* Row validation
* Column validation
* 3×3 box validation
* Complete Sudoku generation
* Puzzle clue counts
* Unique-solution detection
* Multiple-solution detection
* Invalid Sudoku detection
* Difficulty mapping
* Case-insensitive difficulty handling
* Invalid difficulty handling
* Unique puzzle generation for Easy
* Unique puzzle generation for Medium
* Unique puzzle generation for Hard
* Flask invalid-difficulty response
* Generated puzzle uniqueness
* Requested clue preservation

Frontend timer, hint, and leaderboard behavior has additionally been manually verified through browser testing.

---

# GitHub Copilot Usage

GitHub Copilot was used throughout the development process to assist with:

* Understanding the existing codebase
* Planning implementation milestones
* Refactoring Sudoku generation logic
* Implementing unique-solution validation
* Adding difficulty levels
* Implementing the timer
* Implementing the hint system
* Building the leaderboard
* Adding localStorage persistence
* Adding dark mode
* Improving UI behavior
* Creating automated tests
* Debugging implementation issues
* Reviewing requirements
* Performing final QA

The development process followed an incremental approach where major features were planned, implemented, tested, reviewed, and committed.

---

# Development Milestones

The project was developed progressively:

```text
1. Baseline Sudoku
        ↓
2. Automated Tests
        ↓
3. Unique Solution Validation
        ↓
4. Difficulty Levels
        ↓
5. Game Timer
        ↓
6. Hint System
        ↓
7. Top 10 Leaderboard
        ↓
8. localStorage Persistence
        ↓
9. Dark Mode
        ↓
10. UI / UX Improvements
        ↓
11. Final QA
```

This milestone-based approach helped keep the implementation organized and made it easier to validate each major feature.

---

# Project Validation

Before final submission, the project should be validated using:

```bash
python -m pytest -v
```

Expected result:

```text
19 passed
```

The application should also be manually tested for:

* Difficulty selection
* Puzzle generation
* Unique solutions
* Timer behavior
* Hint functionality
* Incorrect-cell highlighting
* Solution checking
* Score saving
* Leaderboard persistence
* Dark/light mode
* Responsive layout

---

# Future Improvements

Possible future improvements include:

* Keyboard navigation between Sudoku cells
* Number-pad interface for mobile devices
* Full keyboard accessibility
* Modal focus trapping
* JavaScript unit tests
* Playwright end-to-end tests
* Improved Sudoku solving heuristics
* More advanced difficulty generation
* User accounts
* Server-side score persistence
* Database-backed leaderboard
* Multiplayer Sudoku
* Daily Sudoku challenges
* Online global leaderboard

---

# License

This project is intended as a learning and development project for practicing Python Flask, JavaScript, Git, GitHub, and GitHub Copilot-assisted software development.

// Client-side rendering and interaction for the Flask-backed Sudoku game

const SIZE = 9;

let puzzle = [];

// Timer state
let timerInterval = null;
let startTimestamp = null;
let elapsedSeconds = 0;
let timerRunning = false;
let lastCompletionTimeSeconds = null;

// Hint state
let hintsUsed = 0;
let hintInProgress = false;

// Leaderboard state
const SCORES_KEY = 'sudokuTopScores';
const MAX_SCORES = 10;

let currentDifficulty = null;
let gameScoreSaved = false;

// Theme state
const THEME_KEY = 'sudokuTheme';
let currentTheme = 'light';


// ============================================================
// Utility helpers
// ============================================================

function getMessageElement() {
    return document.getElementById('message');
}

function setMessage(text, type = 'error') {
    const message = getMessageElement();

    if (!message) {
        return;
    }

    message.textContent = text;

    if (type === 'success') {
        message.style.color = '#388e3c';
    } else if (type === 'error') {
        message.style.color = '#d32f2f';
    } else {
        message.style.color = '';
    }
}

function clearMessage() {
    const message = getMessageElement();

    if (!message) {
        return;
    }

    message.textContent = '';
    message.style.color = '';
}


// ============================================================
// Sudoku board creation
// ============================================================

function createBoardElement() {
    const boardDiv = document.getElementById('sudoku-board');

    if (!boardDiv) {
        return;
    }

    boardDiv.innerHTML = '';

    for (let row = 0; row < SIZE; row++) {
        const rowDiv = document.createElement('div');

        rowDiv.className = 'sudoku-row';

        for (let col = 0; col < SIZE; col++) {
            const input = document.createElement('input');

            input.type = 'text';
            input.maxLength = 1;
            input.inputMode = 'numeric';
            input.autocomplete = 'off';

            input.className = 'sudoku-cell';

            input.dataset.row = String(row);
            input.dataset.col = String(col);

            /*
             * Alternate the background of 3x3 blocks.
             *
             * Blocks:
             * 0 1 2
             * 3 4 5
             * 6 7 8
             */
            const blockNumber =
                Math.floor(row / 3) * 3 +
                Math.floor(col / 3);

            if (blockNumber % 2 === 0) {
                input.classList.add('block-shaded');
            }

            rowDiv.appendChild(input);
        }

        boardDiv.appendChild(rowDiv);
    }

    /*
     * Event delegation:
     * One listener on the board handles input from every cell.
     */
    boardDiv.addEventListener('input', handleBoardInput);
}


// ============================================================
// Immediate input validation
// ============================================================

function handleBoardInput(event) {
    const cell = event.target;

    if (!cell.classList.contains('sudoku-cell')) {
        return;
    }

    if (cell.disabled) {
        return;
    }

    // Only allow digits 1-9.
    const cleanedValue = cell.value.replace(/[^1-9]/g, '');

    cell.value = cleanedValue;

    validateBoardConflicts();
}


function validateBoardConflicts() {
    const boardDiv = document.getElementById('sudoku-board');

    if (!boardDiv) {
        return false;
    }

    const cells = Array.from(
        boardDiv.querySelectorAll('.sudoku-cell')
    );
    const conflictTypes = new Set();

    cells.forEach(cell => {
        cell.classList.remove('invalid-input');
    });

    cells.forEach(cell => {
        if (cell.disabled || !cell.value) {
            return;
        }

        const conflicts = getConflictTypes(cell, cells);

        if (conflicts.length === 0) {
            return;
        }

        cell.classList.add('invalid-input');
        conflicts.forEach(type => conflictTypes.add(type));
    });

    if (conflictTypes.size === 0) {
        clearMessage();
        return false;
    }

    setMessage(
        `Value conflicts with another value in the ${
            formatConflictTypes(conflictTypes)
        }.`,
        'error'
    );

    return true;
}


function getConflictTypes(cell, cells) {
    if (!cell || !cell.value) {
        return [];
    }

    const value = cell.value;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const conflicts = new Set();

    for (const otherCell of cells) {
        if (otherCell === cell) {
            continue;
        }

        if (!otherCell.value) {
            continue;
        }

        if (otherCell.value !== value) {
            continue;
        }

        if (Number(otherCell.dataset.row) === row) {
            conflicts.add('same row');
        }

        if (Number(otherCell.dataset.col) === col) {
            conflicts.add('same column');
        }

        const otherRow = Number(otherCell.dataset.row);
        const otherCol = Number(otherCell.dataset.col);

        const sameBlock =
            Math.floor(row / 3) === Math.floor(otherRow / 3) &&
            Math.floor(col / 3) === Math.floor(otherCol / 3);

        if (sameBlock) {
            conflicts.add('same 3x3 box');
        }
    }

    return Array.from(conflicts);
}


function formatConflictTypes(conflictTypes) {
    const types = Array.from(conflictTypes);

    if (types.length === 1) {
        return types[0];
    }

    if (types.length === 2) {
        return `${types[0]} or ${types[1]}`;
    }

    return `${types[0]}, ${types[1]}, or ${types[2]}`;
}


// ============================================================
// Render puzzle
// ============================================================

function renderPuzzle(puz) {
    puzzle = puz;

    createBoardElement();

    const boardDiv = document.getElementById('sudoku-board');

    if (!boardDiv) {
        return;
    }

    const inputs = boardDiv.querySelectorAll('.sudoku-cell');

    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const index = row * SIZE + col;

            const input = inputs[index];
            const value = puzzle[row][col];

            if (value !== 0) {
                input.value = String(value);
                input.disabled = true;
                input.classList.add('prefilled');
            } else {
                input.value = '';
                input.disabled = false;
            }
        }
    }
}


// ============================================================
// Timer
// ============================================================

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(seconds).padStart(2, '0')
    );
}


function getElapsedSeconds() {
    if (timerRunning && startTimestamp !== null) {
        const delta = Math.floor(
            (Date.now() - startTimestamp) / 1000
        );

        return elapsedSeconds + delta;
    }

    return elapsedSeconds;
}


function updateTimerDisplay() {
    const timer = document.getElementById('timer');

    if (!timer) {
        return;
    }

    timer.textContent = formatTime(getElapsedSeconds());
}


function startTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    startTimestamp = Date.now();
    timerRunning = true;

    updateTimerDisplay();

    timerInterval = setInterval(
        updateTimerDisplay,
        1000
    );
}


function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (timerRunning && startTimestamp !== null) {
        const delta = Math.floor(
            (Date.now() - startTimestamp) / 1000
        );

        elapsedSeconds += delta;
    }

    timerRunning = false;
    startTimestamp = null;

    lastCompletionTimeSeconds = elapsedSeconds;

    updateTimerDisplay();

    return lastCompletionTimeSeconds;
}


function resetTimer() {
    stopTimer();

    elapsedSeconds = 0;
    lastCompletionTimeSeconds = null;

    updateTimerDisplay();
}


// ============================================================
// Hint system
// ============================================================

function getEditableEmptyCells() {
    const board = document.getElementById('sudoku-board');

    if (!board) {
        return [];
    }

    return Array.from(
        board.querySelectorAll('.sudoku-cell')
    ).filter(cell =>
        !cell.disabled &&
        cell.value.trim() === ''
    );
}


function applyHintToCell(cell, value) {
    cell.value = String(value);

    cell.disabled = true;

    cell.classList.add('hinted');

    // Remove any temporary validation state.
    cell.classList.remove('invalid-input');
}


async function requestHint() {
    if (hintInProgress) {
        return;
    }

    const hintButton = document.getElementById('hint');
    const hintCount = document.getElementById('hint-count');

    const editableCells = getEditableEmptyCells();

    if (editableCells.length === 0) {
        setMessage(
            'No empty editable cells are available for a hint.',
            'error'
        );

        return;
    }

    const target = editableCells[0];

    const row = Number(target.dataset.row);
    const col = Number(target.dataset.col);

    hintInProgress = true;

    if (hintButton) {
        hintButton.disabled = true;
    }

    clearMessage();

    try {
        const board = readBoardFromDOM();

        let found = false;

        /*
         * Test values 1-9 against the server.
         *
         * The server tells us which cells are incorrect.
         * If the selected cell is not reported as incorrect,
         * the candidate is the correct value.
         */
        for (let candidate = 1; candidate <= 9; candidate++) {
            const candidateBoard =
                board.map(currentRow => currentRow.slice());

            candidateBoard[row][col] = candidate;

            const response = await fetch('/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    board: candidateBoard
                })
            });

            if (!response.ok) {
                throw new Error('Hint request failed.');
            }

            const data = await response.json();

            if (data.error) {
                setMessage(data.error, 'error');
                return;
            }

            const incorrect = data.incorrect || [];

            const targetIsIncorrect = incorrect.some(
                position =>
                    position[0] === row &&
                    position[1] === col
            );

            if (!targetIsIncorrect) {
                applyHintToCell(target, candidate);

                hintsUsed += 1;

                if (hintCount) {
                    hintCount.textContent =
                        `Hints: ${hintsUsed}`;
                }

                found = true;

                break;
            }
        }

        if (!found) {
            setMessage(
                'Hint unavailable for this cell.',
                'error'
            );
        }
    } catch (error) {
        console.error('Hint error:', error);

        setMessage(
            'Unable to get a hint. Please try again.',
            'error'
        );
    } finally {
        hintInProgress = false;

        if (hintButton) {
            hintButton.disabled = false;
        }
    }
}


// ============================================================
// Board helpers
// ============================================================

function readBoardFromDOM() {
    const board = [];

    const boardDiv =
        document.getElementById('sudoku-board');

    if (!boardDiv) {
        return board;
    }

    const inputs =
        boardDiv.querySelectorAll('.sudoku-cell');

    for (let row = 0; row < SIZE; row++) {
        board[row] = [];

        for (let col = 0; col < SIZE; col++) {
            const index = row * SIZE + col;

            const value = inputs[index].value.trim();

            board[row][col] =
                value ? Number(value) : 0;
        }
    }

    return board;
}


// ============================================================
// Leaderboard
// ============================================================

function validateScore(score) {
    if (!score || typeof score !== 'object') {
        return false;
    }

    if (typeof score.name !== 'string') {
        return false;
    }

    if (
        typeof score.timeSeconds !== 'number' ||
        !Number.isFinite(score.timeSeconds) ||
        score.timeSeconds < 0
    ) {
        return false;
    }

    if (typeof score.timeFormatted !== 'string') {
        return false;
    }

    if (
        typeof score.difficulty !== 'string' &&
        score.difficulty !== null
    ) {
        return false;
    }

    if (
        typeof score.hintsUsed !== 'number' ||
        score.hintsUsed < 0
    ) {
        return false;
    }

    if (
        typeof score.ts !== 'number' ||
        !Number.isFinite(score.ts)
    ) {
        return false;
    }

    return true;
}


function loadScores() {
    try {
        const raw =
            localStorage.getItem(SCORES_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(validateScore);
    } catch (error) {
        console.error(
            'Invalid leaderboard data:',
            error
        );

        return [];
    }
}


function saveScores(scores) {
    try {
        localStorage.setItem(
            SCORES_KEY,
            JSON.stringify(scores)
        );

        return true;
    } catch (error) {
        console.error(
            'Failed to save leaderboard:',
            error
        );

        return false;
    }
}


function insertScore(score) {
    if (!validateScore(score)) {
        return false;
    }

    const scores = loadScores();

    scores.push(score);

    scores.sort((a, b) => {
        if (a.timeSeconds !== b.timeSeconds) {
            return a.timeSeconds - b.timeSeconds;
        }

        return a.ts - b.ts;
    });

    const topScores =
        scores.slice(0, MAX_SCORES);

    /*
     * IMPORTANT:
     * Only report success if localStorage actually
     * accepted the new data.
     */
    return saveScores(topScores);
}


function clearLeaderboard() {
    try {
        localStorage.removeItem(SCORES_KEY);
    } catch (error) {
        console.error(
            'Failed to clear leaderboard:',
            error
        );
    }

    renderLeaderboard();
}


function renderLeaderboard() {
    const tbody =
        document.querySelector('#leaderboard tbody');

    if (!tbody) {
        return;
    }

    tbody.innerHTML = '';

    const scores = loadScores();

    if (scores.length === 0) {
        const row = document.createElement('tr');

        const cell = document.createElement('td');

        cell.colSpan = 5;
        cell.textContent = 'No scores yet.';

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    scores.forEach((score, index) => {
        const row = document.createElement('tr');

        const rankCell =
            document.createElement('td');

        const nameCell =
            document.createElement('td');

        const timeCell =
            document.createElement('td');

        const difficultyCell =
            document.createElement('td');

        const hintsCell =
            document.createElement('td');

        rankCell.textContent = String(index + 1);
        nameCell.textContent = score.name;
        timeCell.textContent = score.timeFormatted;
        difficultyCell.textContent =
            score.difficulty || '';
        hintsCell.textContent =
            String(score.hintsUsed);

        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(timeCell);
        row.appendChild(difficultyCell);
        row.appendChild(hintsCell);

        tbody.appendChild(row);
    });
}


// ============================================================
// Theme / dark mode
// ============================================================

function applyTheme(theme) {
    currentTheme = theme;

    document.body.classList.toggle(
        'dark-mode',
        theme === 'dark'
    );

    const themeButton =
        document.getElementById('theme-toggle');

    if (themeButton) {
        themeButton.textContent =
            theme === 'dark'
                ? 'Light Mode'
                : 'Dark Mode';
    }
}


function persistTheme(theme) {
    try {
        localStorage.setItem(
            THEME_KEY,
            theme
        );
    } catch (error) {
        console.error(
            'Failed to save theme:',
            error
        );
    }
}


function initTheme() {
    try {
        const storedTheme =
            localStorage.getItem(THEME_KEY);

        applyTheme(
            storedTheme === 'dark'
                ? 'dark'
                : 'light'
        );
    } catch (error) {
        console.error(
            'Failed to load theme:',
            error
        );

        applyTheme('light');
    }
}


function toggleTheme() {
    const nextTheme =
        currentTheme === 'dark'
            ? 'light'
            : 'dark';

    applyTheme(nextTheme);

    persistTheme(nextTheme);
}


// ============================================================
// Save-score modal
// ============================================================

function showSaveModal() {
    const modal =
        document.getElementById('save-modal');

    if (!modal) {
        return;
    }

    const timeElement =
        document.getElementById('modal-time');

    const difficultyElement =
        document.getElementById('modal-difficulty');

    const hintsElement =
        document.getElementById('modal-hints');

    const nameInput =
        document.getElementById('player-name');

    if (timeElement) {
        timeElement.textContent =
            formatTime(
                lastCompletionTimeSeconds || 0
            );
    }

    if (difficultyElement) {
        difficultyElement.textContent =
            currentDifficulty || '';
    }

    if (hintsElement) {
        hintsElement.textContent =
            String(hintsUsed);
    }

    if (nameInput) {
        nameInput.value = '';
    }

    modal.setAttribute(
        'aria-hidden',
        'false'
    );

    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
        }, 0);
    }
}


function hideSaveModal() {
    const modal =
        document.getElementById('save-modal');

    if (!modal) {
        return;
    }

    modal.setAttribute(
        'aria-hidden',
        'true'
    );
}


function onSaveScore() {
    const nameInput =
        document.getElementById('player-name');

    const saveButton =
        document.getElementById('save-score');

    if (!nameInput) {
        return;
    }

    const name =
        nameInput.value.trim();

    if (!name) {
        setMessage(
            'Please enter your name to save your score.',
            'error'
        );

        nameInput.focus();

        return;
    }

    const timeSeconds =
        lastCompletionTimeSeconds !== null
            ? lastCompletionTimeSeconds
            : getElapsedSeconds();

    const score = {
        name: name,
        timeSeconds: Number(timeSeconds),
        timeFormatted: formatTime(
            Number(timeSeconds)
        ),
        difficulty: currentDifficulty || null,
        hintsUsed: Number(hintsUsed),
        ts: Date.now()
    };

    if (saveButton) {
        saveButton.disabled = true;
    }

    const saved =
        insertScore(score);

    if (saved) {
        gameScoreSaved = true;

        hideSaveModal();

        renderLeaderboard();

        setMessage(
            'Score saved successfully!',
            'success'
        );
    } else {
        setMessage(
            'Failed to save score. Please try again.',
            'error'
        );
    }

    if (saveButton) {
        saveButton.disabled = false;
    }
}


// ============================================================
// New game
// ============================================================

async function newGame() {
    resetTimer();

    hintsUsed = 0;

    const hintCount =
        document.getElementById('hint-count');

    if (hintCount) {
        hintCount.textContent = 'Hints: 0';
    }

    const hintButton =
        document.getElementById('hint');

    if (hintButton) {
        hintButton.disabled = false;
    }

    gameScoreSaved = false;

    const difficultyElement =
        document.getElementById('difficulty');

    currentDifficulty =
        difficultyElement
            ? difficultyElement.value
            : null;

    clearMessage();

    try {
        const url =
            currentDifficulty
                ? `/new?difficulty=${encodeURIComponent(currentDifficulty)}`
                : '/new';

        const response =
            await fetch(url);

        if (!response.ok) {
            const errorData =
                await response.json().catch(
                    () => ({})
                );

            throw new Error(
                errorData.error ||
                'Failed to load puzzle.'
            );
        }

        const data =
            await response.json();

        if (
            !data ||
            !Array.isArray(data.puzzle)
        ) {
            throw new Error(
                'Invalid puzzle data received.'
            );
        }

        renderPuzzle(data.puzzle);

        startTimer();
    } catch (error) {
        console.error(
            'New game error:',
            error
        );

        setMessage(
            error.message ||
            'Failed to load new puzzle.',
            'error'
        );
    }
}


// ============================================================
// Check solution
// ============================================================

async function checkSolution() {
    const boardDiv =
        document.getElementById('sudoku-board');

    if (!boardDiv) {
        return;
    }

    const inputs =
        boardDiv.querySelectorAll('.sudoku-cell');

    const board =
        readBoardFromDOM();

    try {
        const response =
            await fetch('/check', {
                method: 'POST',
                headers: {
                    'Content-Type':
                        'application/json'
                },
                body: JSON.stringify({
                    board: board
                })
            });

        const data =
            await response.json();

        if (!response.ok || data.error) {
            setMessage(
                data.error ||
                'Unable to check the puzzle.',
                'error'
            );

            return;
        }

        const incorrectPositions =
            data.incorrect || [];

        const incorrectSet =
            new Set(
                incorrectPositions.map(
                    position =>
                        position[0] * SIZE +
                        position[1]
                )
            );

        inputs.forEach((input, index) => {
            if (input.disabled) {
                return;
            }

            /*
             * Remove old "Check Solution" error styling.
             * Preserve block shading, hints and input state.
             */
            input.classList.remove('incorrect');

            if (incorrectSet.has(index)) {
                input.classList.add('incorrect');
            }
        });

        if (incorrectSet.size === 0) {
            stopTimer();

            const hintsText =
                hintsUsed === 1
                    ? '1 hint'
                    : `${hintsUsed} hints`;

            setMessage(
                `Congratulations! You solved it in ${formatTime(lastCompletionTimeSeconds)} using ${hintsText}.`,
                'success'
            );

            if (!gameScoreSaved) {
                showSaveModal();
            }
        } else {
            setMessage(
                'Some cells are incorrect.',
                'error'
            );
        }
    } catch (error) {
        console.error(
            'Check solution error:',
            error
        );

        setMessage(
            'Unable to check the solution. Please try again.',
            'error'
        );
    }
}


// ============================================================
// Keyboard support for modal
// ============================================================

function handleModalKeyboard(event) {
    const modal =
        document.getElementById('save-modal');

    if (!modal) {
        return;
    }

    if (
        modal.getAttribute('aria-hidden') === 'false' &&
        event.key === 'Escape'
    ) {
        hideSaveModal();
    }
}


// ============================================================
// Expose helpers for testing / integration
// ============================================================

window.loadTopScores = loadScores;
window.insertTopScore = insertScore;
window.clearTopScores = clearLeaderboard;

window.getHintsUsed = function () {
    return hintsUsed;
};

window.getElapsedSeconds =
    getElapsedSeconds;

window.getLastCompletionTimeSeconds =
    function () {
        return lastCompletionTimeSeconds;
    };


// ============================================================
// Event wiring
// ============================================================

window.addEventListener('load', () => {
    const newGameButton =
        document.getElementById('new-game');

    const checkButton =
        document.getElementById('check-solution');

    const hintButton =
        document.getElementById('hint');

    const themeButton =
        document.getElementById('theme-toggle');

    const clearButton =
        document.getElementById('clear-leaderboard');

    const saveButton =
        document.getElementById('save-score');

    const cancelButton =
        document.getElementById('cancel-save');

    if (newGameButton) {
        newGameButton.addEventListener(
            'click',
            newGame
        );
    }

    if (checkButton) {
        checkButton.addEventListener(
            'click',
            checkSolution
        );
    }

    if (hintButton) {
        hintButton.addEventListener(
            'click',
            requestHint
        );
    }

    if (themeButton) {
        themeButton.addEventListener(
            'click',
            toggleTheme
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            'click',
            () => {
                const confirmed =
                    confirm(
                        'Clear all leaderboard scores?'
                    );

                if (confirmed) {
                    clearLeaderboard();
                    setMessage(
                        'Leaderboard cleared.',
                        'success'
                    );
                }
            }
        );
    }

    if (saveButton) {
        saveButton.addEventListener(
            'click',
            onSaveScore
        );
    }

    if (cancelButton) {
        cancelButton.addEventListener(
            'click',
            hideSaveModal
        );
    }

    document.addEventListener(
        'keydown',
        handleModalKeyboard
    );

    initTheme();

    renderLeaderboard();

    newGame();
});
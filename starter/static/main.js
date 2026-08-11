// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
// Timer state
let timerInterval = null;
let startTimestamp = null; // ms
let elapsedSeconds = 0; // accumulated seconds when not running
let timerRunning = false;
let lastCompletionTimeSeconds = null; // final time in seconds for scoreboard
// Hint state
let hintsUsed = 0;
let hintInProgress = false;
// Scoreboard state
const SCORES_KEY = 'sudokuTopScores';
const MAX_SCORES = 10;
let currentDifficulty = null;
let gameScoreSaved = false; // prevent duplicate submissions per game
let currentTheme = 'light';
const THEME_KEY = 'sudokuTheme';

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      if ((Math.floor(i / 3) + Math.floor(j / 3)) % 2 === 0) {
        input.classList.add('block-shaded');
      }
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

/* Timer utility functions */
function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}:${ss}`;
}

function getElapsedSeconds() {
  if (timerRunning && startTimestamp !== null) {
    const delta = Math.floor((Date.now() - startTimestamp) / 1000);
    return elapsedSeconds + delta;
  }
  return elapsedSeconds;
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const secs = getElapsedSeconds();
  el.innerText = formatTime(secs);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (timerRunning && startTimestamp !== null) {
    const delta = Math.floor((Date.now() - startTimestamp) / 1000);
    elapsedSeconds += delta;
  }
  timerRunning = false;
  startTimestamp = null;
  lastCompletionTimeSeconds = elapsedSeconds;
  updateTimerDisplay();
  return lastCompletionTimeSeconds;
}

function startTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    startTimestamp = Date.now();
    timerRunning = true;

    updateTimerDisplay();
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function resetTimer() {
  stopTimer();
  elapsedSeconds = 0;
  lastCompletionTimeSeconds = null;
  const el = document.getElementById('timer');
  if (el) el.innerText = formatTime(0);
}

/* Hint helper functions */
function getEditableEmptyCells() {
  const boardDiv = document.getElementById('sudoku-board');
  if (!boardDiv) return [];
  const inputs = Array.from(boardDiv.getElementsByTagName('input'));
  return inputs.filter(inp => !inp.disabled && String(inp.value).trim() === '');
}

function applyHintToCell(inputEl, value) {
  inputEl.value = String(value);
  inputEl.disabled = true;
  // keep base class and add hinted marker
  if (inputEl.classList) {
    inputEl.classList.add('hinted');
  } else {
    inputEl.className = (inputEl.className + ' hinted').trim();
  }
}

async function requestHint() {
  if (hintInProgress) return;
  const hintBtn = document.getElementById('hint');
  const msgEl = document.getElementById('message');
  const hintCountEl = document.getElementById('hint-count');
  const editable = getEditableEmptyCells();
  if (editable.length === 0) {
    if (msgEl) {
      msgEl.style.color = '#d32f2f';
      msgEl.innerText = 'No empty editable cells to hint.';
    }
    return;
  }

  // pick the first editable empty cell
  const target = editable[0];
  const row = parseInt(target.dataset.row, 10);
  const col = parseInt(target.dataset.col, 10);

  hintInProgress = true;
  if (hintBtn) hintBtn.disabled = true;
  if (msgEl) { msgEl.innerText = ''; }

  try {
    // build current board values from DOM
    const boardDiv = document.getElementById('sudoku-board');
    const inputs = boardDiv.getElementsByTagName('input');
    const baseBoard = [];
    for (let i = 0; i < SIZE; i++) {
      baseBoard[i] = [];
      for (let j = 0; j < SIZE; j++) {
        const idx = i * SIZE + j;
        const val = inputs[idx].value;
        baseBoard[i][j] = val ? parseInt(val, 10) : 0;
      }
    }

    let found = false;
    for (let k = 1; k <= 9; k++) {
      // copy board and set candidate
      const candidateBoard = baseBoard.map(row => row.slice());
      candidateBoard[row][col] = k;
      const res = await fetch('/check', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({board: candidateBoard})
      });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await res.json();
      if (data.error) {
        // If server says no game in progress or similar, show message and abort
        if (msgEl) {
          msgEl.style.color = '#d32f2f';
          msgEl.innerText = data.error;
        }
        break;
      }
      const incorrect = data.incorrect || [];
      const targetStillIncorrect = incorrect.some(pos => pos[0] === row && pos[1] === col);
      if (!targetStillIncorrect) {
        // candidate is correct
        applyHintToCell(target, k);
        hintsUsed += 1;
        if (hintCountEl) hintCountEl.innerText = `Hints: ${hintsUsed}`;
        found = true;
        break;
      }
    }

    if (!found) {
      if (msgEl) {
        msgEl.style.color = '#d32f2f';
        msgEl.innerText = 'Hint unavailable.';
      }
    }
  } catch (err) {
    console.error('requestHint error:', err);
    if (msgEl) {
      msgEl.style.color = '#d32f2f';
      msgEl.innerText = 'Network error while requesting a hint.';
    }
  } finally {
    hintInProgress = false;
    if (hintBtn) hintBtn.disabled = false;
  }
}

// expose hint getter
window.getHintsUsed = function () { return hintsUsed; };

// Scoreboard helpers
function loadScores() {
  const raw = localStorage.getItem(SCORES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validateScore);
  } catch (err) {
    console.error('Failed to parse scoreboard data, resetting:', err);
    return [];
  }
}

function saveScores(scores) {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    return true;
  } catch (err) {
    console.error('Failed to save scores:', err);
    return false;
  }
}

function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  currentTheme = theme;
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.innerText = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    console.error('Failed to save theme preference:', err);
  }
}

function initTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    applyTheme(stored === 'dark' ? 'dark' : 'light');
  } catch (err) {
    console.error('Failed to load theme preference:', err);
    applyTheme('light');
  }
}

function toggleTheme() {
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

function validateScore(s) {
  if (!s || typeof s !== 'object') return false;
  if (typeof s.name !== 'string') return false;
  if (typeof s.timeSeconds !== 'number' || !isFinite(s.timeSeconds) || s.timeSeconds < 0) return false;
  if (typeof s.timeFormatted !== 'string') return false;
  if (!(typeof s.difficulty === 'string' || s.difficulty === null)) return false;
  if (typeof s.hintsUsed !== 'number' || s.hintsUsed < 0) return false;
  if (typeof s.ts !== 'number' || !isFinite(s.ts)) return false;
  return true;
}

function insertScore(score) {
  if (!validateScore(score)) return false;
  const scores = loadScores();
  scores.push(score);
  // sort by timeSeconds asc, tie-breaker ts asc
  scores.sort((a,b) => {
    if (a.timeSeconds !== b.timeSeconds) return a.timeSeconds - b.timeSeconds;
    return a.ts - b.ts;
  });
  const trimmed = scores.slice(0, MAX_SCORES);
  return saveScores(trimmed);
}

function clearLeaderboard() {
  localStorage.removeItem(SCORES_KEY);
  renderLeaderboard();
}

function renderLeaderboard() {
  const tbody = document.querySelector('#leaderboard tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const scores = loadScores();
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    const tr = document.createElement('tr');
    const rankTd = document.createElement('td'); rankTd.innerText = (i+1);
    const nameTd = document.createElement('td'); nameTd.innerText = s.name;
    const timeTd = document.createElement('td'); timeTd.innerText = s.timeFormatted;
    const diffTd = document.createElement('td'); diffTd.innerText = s.difficulty || '';
    const hintsTd = document.createElement('td'); hintsTd.innerText = String(s.hintsUsed);
    tr.appendChild(rankTd); tr.appendChild(nameTd); tr.appendChild(timeTd); tr.appendChild(diffTd); tr.appendChild(hintsTd);
    tbody.appendChild(tr);
  }
}

// expose helpers for testing
window.loadTopScores = loadScores;
window.insertTopScore = insertScore;
window.clearTopScores = clearLeaderboard;

// Modal control functions
function showSaveModal() {
  const modal = document.getElementById('save-modal');
  if (!modal) return;
  const timeSpan = document.getElementById('modal-time');
  const diffSpan = document.getElementById('modal-difficulty');
  const hintsSpan = document.getElementById('modal-hints');
  const nameInput = document.getElementById('player-name');
  if (timeSpan) timeSpan.innerText = formatTime(lastCompletionTimeSeconds || 0);
  if (diffSpan) diffSpan.innerText = currentDifficulty || '';
  if (hintsSpan) hintsSpan.innerText = String(hintsUsed);
  if (nameInput) nameInput.value = '';
  modal.setAttribute('aria-hidden', 'false');
}

function hideSaveModal() {
  const modal = document.getElementById('save-modal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
}

function onSaveScore() {
  const nameInput = document.getElementById('player-name');
  const saveBtn = document.getElementById('save-score');
  const msg = document.getElementById('message');
  if (!nameInput) return;
  const name = String(nameInput.value || '').trim();
  if (!name) {
    alert('Please enter your name to save the score.');
    return;
  }
  if (saveBtn) saveBtn.disabled = true;
  const timeSeconds = lastCompletionTimeSeconds != null ? lastCompletionTimeSeconds : getElapsedSeconds();
  const score = {
    name,
    timeSeconds: Number(timeSeconds),
    timeFormatted: formatTime(Number(timeSeconds)),
    difficulty: currentDifficulty || null,
    hintsUsed: Number(hintsUsed || 0),
    ts: Date.now(),
  };
  const ok = insertScore(score);
  if (ok) {
    gameScoreSaved = true;
    hideSaveModal();
    renderLeaderboard();
    if (msg) {
      msg.style.color = '#388e3c';
      msg.innerText = 'Score saved successfully!';
    }
  } else {
    if (msg) {
      msg.style.color = '#d32f2f';
      msg.innerText = 'Failed to save score. Please try again.';
    }
    alert('Failed to save score.');
  }
  if (saveBtn) saveBtn.disabled = false;
}

// expose getters for future scoreboard integration
window.getElapsedSeconds = getElapsedSeconds;
window.getLastCompletionTimeSeconds = function () { return lastCompletionTimeSeconds; };

async function newGame() {
  // stop/reset any previous timer before starting a new fetch
  resetTimer();
  // reset hints
  hintsUsed = 0;
  const hintCountEl = document.getElementById('hint-count');
  if (hintCountEl) hintCountEl.innerText = `Hints: ${hintsUsed}`;
  const hintBtn = document.getElementById('hint');
  if (hintBtn) hintBtn.disabled = false;
  // reset per-game scoreboard flag
  gameScoreSaved = false;
  // read selected difficulty from UI
  const diffEl = document.getElementById('difficulty');
  const selected = diffEl ? diffEl.value : null;
  currentDifficulty = selected || null;
  const msgEl = document.getElementById('message');
  try {
    // request server with difficulty param when provided
    const url = currentDifficulty ? `/new?difficulty=${encodeURIComponent(currentDifficulty)}` : '/new';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    if (!data || !data.puzzle) throw new Error('Invalid puzzle data');
    renderPuzzle(data.puzzle);
    if (msgEl) {
      msgEl.style.color = '';
      msgEl.innerText = '';
    }
    // start timer only after puzzle successfully loaded
    startTimer();
  } catch (err) {
    if (msgEl) {
      msgEl.style.color = '#d32f2f';
      msgEl.innerText = 'Failed to load new puzzle.';
    }
    console.error('newGame error:', err);
  }
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    const baseClasses = ['sudoku-cell'];
    if (inp.classList.contains('block-shaded')) baseClasses.push('block-shaded');
    if (incorrect.has(idx)) baseClasses.push('incorrect');
    inp.className = baseClasses.join(' ');
  }
  if (incorrect.size === 0) {
    // stop timer when puzzle is completely correct
    stopTimer();
    msg.style.color = '#388e3c';
    const hintsText = hintsUsed === 1 ? '1 hint' : `${hintsUsed} hints`;
    msg.innerText = `Congratulations! You solved it in ${formatTime(lastCompletionTimeSeconds)} using ${hintsText}.`;
    // Only prompt to save score once per completed game
    if (!gameScoreSaved) {
      showSaveModal();
    }
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  document.getElementById('new-game').addEventListener('click', newGame);
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  const hintBtn = document.getElementById('hint');
  if (hintBtn) hintBtn.addEventListener('click', requestHint);
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  // leaderboard actions
  const clearBtn = document.getElementById('clear-leaderboard');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (!confirm('Clear all leaderboard scores?')) return;
    clearLeaderboard();
  });
  const saveBtn = document.getElementById('save-score');
  const cancelBtn = document.getElementById('cancel-save');
  if (saveBtn) saveBtn.addEventListener('click', onSaveScore);
  if (cancelBtn) cancelBtn.addEventListener('click', hideSaveModal);
  initTheme();
  // render leaderboard initially
  renderLeaderboard();
  // initialize
  newGame();
});
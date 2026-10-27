// Base de Dados de Palavras do Dia Temáticas (MVP)
const WORD_DATABASE = [
    { word: "TIGRE", category: "Animais" },
    { word: "PIZZA", category: "Comida" },
    { word: "TERRA", category: "Ciência" },
    { word: "TENIS", category: "Esportes" },
    { word: "AGUIA", category: "Animais" },
    { word: "FRUTA", category: "Comida" },
    { word: "ATOMO", category: "Ciência" },
    { word: "GOLFE", category: "Esportes" },
    { word: "ZEBRA", category: "Animais" },
    { word: "TORTA", category: "Comida" },
    { word: "ASTRO", category: "Ciência" },
    { word: "SURFE", category: "Esportes" },
    { word: "PATOS", category: "Animais" },
    { word: "LEITE", category: "Comida" },
    { word: "FOSSA", category: "Ciência" },
    { word: "PISTA", category: "Esportes" },
    { word: "LIVRO", category: "Objetos" },
    { word: "CARRO", category: "Objetos" },
    { word: "NAVIO", category: "Objetos" },
    { word: "PEDRA", category: "Ciência" }
];

// Estado do Jogo
let currentPrototype = "vibrant";
let isPracticeMode = false;
let secretWord = "TIGRE";
let currentCategory = "Animais";
let currentAttempt = 0;
let currentTile = 0;
let guesses = Array(6).fill("");
let isGameOver = false;
let letterStates = {}; 

// Elementos do DOM
const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");
const categoryBadge = document.getElementById("categoryBadge");
const streakBadge = document.getElementById("streakBadge");
const messageToast = document.getElementById("messageToast");
const prototypeSelect = document.getElementById("prototypeSelect");

const helpModal = document.getElementById("helpModal");
const statsModal = document.getElementById("statsModal");
const btnHelp = document.getElementById("btnHelp");
const btnStats = document.getElementById("btnStats");
const closeHelp = document.getElementById("closeHelp");
const closeStats = document.getElementById("closeStats");
const btnPractice = document.getElementById("btnPractice");
const btnShare = document.getElementById("btnShare");
const gameOverArea = document.getElementById("gameOverArea");
const secretWordReveal = document.getElementById("secretWordReveal");
const modalTitle = document.getElementById("modalTitle");

// Estatísticas do Usuário com tratamento seguro anti-NaN
let stats = JSON.parse(localStorage.getItem("word_game_stats")) || {};
stats.played = Number(stats.played) || 0;
stats.wins = Number(stats.wins) || 0;
stats.streak = Number(stats.streak) || 0;
stats.maxStreak = Number(stats.maxStreak) || 0;
stats.lastGuessCount = Number(stats.lastGuessCount) || 0;
stats.lastCompletedDate = stats.lastCompletedDate || null;

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    setupBoard();
    initGameData();
    updateStreakDisplay();
    setupEventListeners();
});

function setupBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 6; i++) {
        const row = document.createElement("div");
        row.className = "board-row";
        row.id = `row-${i}`;
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        boardEl.appendChild(row);
    }
}

function initGameData(practice = false) {
    isPracticeMode = practice;
    const availableWords = WORD_DATABASE.filter(item => item.word.length === 5);
    
    if (practice) {
        const randomIndex = Math.floor(Math.random() * availableWords.length);
        secretWord = availableWords[randomIndex].word;
        currentCategory = availableWords[randomIndex].category;
    } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        let hash = 0;
        for (let i = 0; i < todayStr.length; i++) {
            hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % availableWords.length;
        secretWord = availableWords[index].word;
        currentCategory = availableWords[index].category;
    }

    currentAttempt = 0;
    currentTile = 0;
    guesses = Array(6).fill("");
    isGameOver = false;
    letterStates = {};
    setupBoard();
    resetKeyboardUI();
    categoryBadge.textContent = `Tema: ${currentCategory} ${isPracticeMode ? '(Treino)' : ''}`;
    gameOverArea.classList.add("hidden");
    statsModal.classList.add("hidden");
}

function setupEventListeners() {
    prototypeSelect.addEventListener("change", (e) => {
        currentPrototype = e.target.value;
        document.documentElement.setAttribute("data-theme", currentPrototype);
    });

    keyboardEl.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const key = btn.getAttribute("data-key");
        handleKeyInput(key);
    });

    document.addEventListener("keydown", (e) => {
        if (isGameOver) return;
        if (e.key === "Enter") {
            handleKeyInput("ENTER");
        } else if (e.key === "Backspace") {
            handleKeyInput("BACK");
        } else {
            const key = e.key.toUpperCase();
            if (/^[A-ZÇ]$/.test(key)) {
                handleKeyInput(key);
            }
        }
    });

    btnHelp.addEventListener("click", () => helpModal.classList.remove("hidden"));
    closeHelp.addEventListener("click", () => helpModal.classList.add("hidden"));
    btnStats.addEventListener("click", () => {
        updateStatsModalContent();
        statsModal.classList.remove("hidden");
    });
    closeStats.addEventListener("click", () => statsModal.classList.add("hidden"));

    btnPractice.addEventListener("click", () => {
        initGameData(true);
    });

    btnShare.addEventListener("click", shareResult);
}

function handleKeyInput(key) {
    if (isGameOver) return;

    if (key === "ENTER") {
        submitGuess();
    } else if (key === "BACK") {
        if (currentTile > 0) {
            currentTile--;
            guesses[currentAttempt] = guesses[currentAttempt].slice(0, -1);
            updateBoardUI();
        }
    } else {
        if (currentTile < 5) {
            guesses[currentAttempt] += key;
            currentTile++;
            updateBoardUI();
        }
    }
}

function updateBoardUI() {
    const currentWord = guesses[currentAttempt];
    for (let j = 0; j < 5; j++) {
        const tile = document.getElementById(`tile-${currentAttempt}-${j}`);
        tile.textContent = currentWord[j] || "";
        if (j < currentWord.length) {
            tile.classList.add("filled");
        } else {
            tile.classList.remove("filled");
        }
    }
}

function submitGuess() {
    const guess = guesses[currentAttempt];
    
    // Validação de tamanho incompleto
    if (guess.length < 5) {
        showToast("⚠️ Digite uma palavra de 5 letras!");
        shakeRow(currentAttempt);
        return;
    }

    // Validação de feedback por letra
    const resultColors = evaluateGuess(guess, secretWord);
    applyRowColors(currentAttempt, resultColors);
    updateKeyboardStates(guess, resultColors);

    if (guess === secretWord) {
        endGame(true);
        return;
    }

    currentAttempt++;
    currentTile = 0;

    if (currentAttempt === 6) {
        endGame(false);
    }
}

// Efeito visual de tremer a linha caso a palavra esteja incompleta
function shakeRow(rowIdx) {
    const row = document.getElementById(`row-${rowIdx}`);
    if (!row) return;
    row.style.animation = "none";
    row.offsetHeight; 
    row.style.animation = "shake 0.4s ease";
}

function evaluateGuess(guess, secret) {
    const result = Array(5).fill("absent");
    const secretArr = secret.split("");
    const guessArr = guess.split("");

    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === secretArr[i]) {
            result[i] = "correct";
            secretArr[i] = null;
            guessArr[i] = null;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (guessArr[i] !== null) {
            const index = secretArr.indexOf(guessArr[i]);
            if (index !== -1) {
                result[i] = "present";
                secretArr[index] = null;
            }
        }
    }

    return result;
}

function applyRowColors(rowIdx, colors) {
    for (let j = 0; j < 5; j++) {
        const tile = document.getElementById(`tile-${rowIdx}-${j}`);
        tile.classList.remove("filled");
        tile.classList.add(colors[j]);
    }
}

function updateKeyboardStates(guess, colors) {
    for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const status = colors[i];
        const currentStatus = letterStates[letter];

        if (status === "correct") {
            letterStates[letter] = "correct";
        } else if (status === "present" && currentStatus !== "correct") {
            letterStates[letter] = "present";
        } else if (status === "absent" && !currentStatus) {
            letterStates[letter] = "absent";
        }
    }

    const keys = keyboardEl.querySelectorAll("button");
    keys.forEach(btn => {
        const key = btn.getAttribute("data-key");
        if (letterStates[key]) {
            btn.classList.remove("correct", "present", "absent");
            btn.classList.add(letterStates[key]);
        }
    });
}

function resetKeyboardUI() {
    const keys = keyboardEl.querySelectorAll("button");
    keys.forEach(btn => {
        btn.classList.remove("correct", "present", "absent");
    });
}

function endGame(isWin) {
    isGameOver = true;

    if (!isPracticeMode) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (stats.lastCompletedDate !== todayStr) {
            stats.played++;
            if (isWin) {
                stats.wins++;
                stats.streak++;
                if (stats.streak > stats.maxStreak) {
                    stats.maxStreak = stats.streak;
                }
                // Salva o número da tentativa em que o jogador acertou (ex: 3)
                stats.lastGuessCount = currentAttempt + 1;
            } else {
                stats.streak = 0;
                stats.lastGuessCount = 0;
            }
            stats.lastCompletedDate = todayStr;
            localStorage.setItem("word_game_stats", JSON.stringify(stats));
        }
    } else {
        // Se for modo treino, apenas guarda a última tentativa da partida atual
        stats.lastGuessCount = isWin ? currentAttempt + 1 : 0;
    }

    updateStreakDisplay();

    modalTitle.textContent = isWin ? "🎉 Parabéns, Você Venceu!" : "😢 Não foi dessa vez!";
    secretWordReveal.textContent = `A palavra secreta era: ${secretWord}`;
    gameOverArea.classList.remove("hidden");
    updateStatsModalContent();
    statsModal.classList.remove("hidden");
}

function updateStreakDisplay() {
    streakBadge.textContent = `🔥 ${stats.streak}`;
}

function updateStatsModalContent() {
    // Exibe o número exato de tentativas que levou para vencer (ex: 3)
    document.getElementById("statPlayed").textContent = stats.lastGuessCount;
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById("statWinRate").textContent = `${winRate}%`;
    document.getElementById("statStreak").textContent = stats.streak;
    document.getElementById("statMaxStreak").textContent = stats.maxStreak;
}

function shareResult() {
    const emojiMap = {
        correct: "🟩",
        present: "🟨",
        absent: "⬛"
    };

    let shareText = `Joguinho Diário de Palavras (${currentCategory}) 🎯\n`;
    for (let i = 0; i <= currentAttempt; i++) {
        if (i < guesses.length && guesses[i].length === 5) {
            const colors = evaluateGuess(guesses[i], secretWord);
            shareText += colors.map(c => emojiMap[c]).join("") + "\n";
        }
    }

    navigator.clipboard.writeText(shareText).then(() => {
        showToast("Resultado copiado para a área de transferência!");
    }).catch(() => {
        showToast("Não foi possível copiar o resultado.");
    });
}

function showToast(msg) {
    messageToast.textContent = msg;
    messageToast.classList.remove("hidden");
    setTimeout(() => {
        messageToast.classList.add("hidden");
    }, 2500);
}
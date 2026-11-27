// CHESSNOVA — BOT GAME

const chess = new Chess();

const boardElement = document.getElementById("chessboard");
const turnInfo = document.getElementById("turn-info");
const gameStatus = document.getElementById("game-status");

const playerColor = localStorage.getItem("chessNovaPlayerColor") || "w";
const botColor = playerColor === "w" ? "b" : "w";
const botLevel = Number(localStorage.getItem("chessNovaBotLevel")) || 1;

let selectedSquare = null;
let botThinking = false;
let botTimer = null;
let botWorker = null;

const pieces = {
    w: {
        k: "♔", q: "♕", r: "♖",
        b: "♗", n: "♘", p: "♙"
    },
    b: {
        k: "♚", q: "♛", r: "♜",
        b: "♝", n: "♞", p: "♟"
    }
};

const pieceValues = {
    p: 100, n: 320, b: 330,
    r: 500, q: 900, k: 20000
};

// Создание отдельного вычислительного потока
function createBotWorker() {
    if (botWorker) {
        botWorker.terminate();
    }

    botWorker = new Worker("bot-worker.js");
}

// Рисование доски
function drawBoard() {
    boardElement.innerHTML = "";

    const board = chess.board();

    const rows = playerColor === "w"
        ? board
        : [...board].reverse().map(row => [...row].reverse());

    rows.forEach((row, rowIndex) => {
        row.forEach((piece, colIndex) => {
            const square = document.createElement("div");

            square.className =
                (rowIndex + colIndex) % 2 === 0
                    ? "light-square"
                    : "dark-square";

            const file = playerColor === "w"
                ? String.fromCharCode(97 + colIndex)
                : String.fromCharCode(104 - colIndex);

            const rank = playerColor === "w"
                ? 8 - rowIndex
                : rowIndex + 1;

            const squareName = file + rank;

            if (piece) {
                square.textContent = pieces[piece.color][piece.type];

                square.classList.add(
                    piece.color === "w"
                        ? "white-piece"
                        : "black-piece"
                );
            }

            if (selectedSquare === squareName) {
                square.classList.add("selected-square");
            }

            square.addEventListener("click", () => {
                selectPiece(squareName);
            });

            boardElement.appendChild(square);
        });
    });

    updateGameInfo();
}

// Выбор фигур
function selectPiece(square) {
    if (chess.game_over()) return;
    if (botThinking) return;
    if (chess.turn() !== playerColor) return;

    const piece = chess.get(square);

    if (!selectedSquare) {
        if (piece && piece.color === playerColor) {
            selectedSquare = square;
            drawBoard();
        }
        return;
    }

    if (piece && piece.color === playerColor) {
        selectedSquare = square;
        drawBoard();
        return;
    }

    const move = chess.move({
        from: selectedSquare,
        to: square,
        promotion: "q"
    });

    if (!move) {
        selectedSquare = null;
        drawBoard();
        return;
    }

    selectedSquare = null;
    drawBoard();

    if (!chess.game_over()) {
        botTimer = setTimeout(makeBotMove, 600);
    }
}

// Оценка для любителя
function evaluateAmateur() {
    let score = 0;

    chess.board().forEach(row => {
        row.forEach(piece => {
            if (!piece) return;

            const value = pieceValues[piece.type];

            score += piece.color === botColor
                ? value
                : -value;
        });
    });

    return score;
}

// Ход любителя
function chooseAmateurMove() {
    const moves = chess.moves({ verbose: true });

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
        chess.move(move);

        let score = evaluateAmateur();

        if (move.captured) {
            score += pieceValues[move.captured] * 0.7;
        }

        if (move.san.includes("+")) {
            score += 40;
        }

        score += Math.random() * 20;

        chess.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

// Запуск вычисления хода
function makeBotMove() {
    if (chess.game_over()) return;
    if (chess.turn() !== botColor) return;

    botThinking = true;
    updateGameInfo();

    // Новичок
    if (botLevel === 1) {
        const moves = chess.moves({ verbose: true });
        const move = moves[Math.floor(Math.random() * moves.length)];

        finishBotMove(move);
        return;
    }

    // Любитель
    if (botLevel === 2) {
        finishBotMove(chooseAmateurMove());
        return;
    }

    // Остальные уровни работают в Worker
    try {
        createBotWorker();

        botWorker.onmessage = function(event) {
            if (!botThinking) return;

            if (event.data.move) {
                const move = event.data.move;

                finishBotMove(move);
            } else {
                console.error("Ошибка бота:", event.data.error);
                finishBotMove(
                    chess.moves({ verbose: true })[0]
                );
            }
        };

        botWorker.onerror = function(error) {
            console.error("Ошибка Worker:", error);
            finishBotMove(
                chess.moves({ verbose: true })[0]
            );
        };

        botWorker.postMessage({
            fen: chess.fen(),
            color: botColor,
            level: botLevel
        });

    } catch (error) {
        console.error(error);

        const moves = chess.moves({ verbose: true });
        finishBotMove(moves[0]);
    }
}

// Завершение хода
function finishBotMove(move) {
    if (!move || chess.game_over()) {
        botThinking = false;
        drawBoard();
        return;
    }

    chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
    });

    botThinking = false;

    if (botWorker) {
        botWorker.terminate();
        botWorker = null;
    }

    drawBoard();
}

// Информация об игре
function updateGameInfo() {
    if (chess.in_checkmate()) {
        gameStatus.textContent =
            chess.turn() === playerColor
                ? "Ты проиграл! Победил бот."
                : "Поздравляем! Ты победил!";

        turnInfo.textContent = "Игра окончена";
        return;
    }

    if (chess.in_draw()) {
        gameStatus.textContent = "Ничья!";
        turnInfo.textContent = "Игра окончена";
        return;
    }

    gameStatus.textContent = chess.in_check()
        ? "Шах!"
        : "";

    if (botThinking) {
        turnInfo.textContent = "Бот думает...";
    } else if (chess.turn() === playerColor) {
        turnInfo.textContent = "Твой ход";
    } else {
        turnInfo.textContent = "Ход бота";
    }
}

// Новая партия
function restartBotGame() {
    if (botTimer) {
        clearTimeout(botTimer);
        botTimer = null;
    }

    if (botWorker) {
        botWorker.terminate();
        botWorker = null;
    }

    chess.reset();

    selectedSquare = null;
    botThinking = false;

    drawBoard();

    if (playerColor === "b") {
        botTimer = setTimeout(makeBotMove, 600);
    }
}

// Запуск
drawBoard();

if (playerColor === "b") {
    botTimer = setTimeout(makeBotMove, 600);
}
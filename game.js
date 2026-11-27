const chess = new Chess();

const board = document.getElementById("chessboard");
const turnInfo = document.getElementById("turn-info");
const gameStatus = document.getElementById("game-status");

let selectedSquare = null;
let possibleMoves = [];

let checkFlashSquare = null;
let checkFlashTimer = null;

const pieces = {
    wk: "♔",
    wq: "♕",
    wr: "♖",
    wb: "♗",
    wn: "♘",
    wp: "♙",

    bk: "♚",
    bq: "♛",
    br: "♜",
    bb: "♝",
    bn: "♞",
    bp: "♟"
};

// Поиск короля
function findKingSquare(color) {
    const position = chess.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position[row][col];

            if (piece && piece.type === "k" && piece.color === color) {
                return "abcdefgh"[col] + (8 - row);
            }
        }
    }

    return null;
}

// Создание шахматной доски
function drawBoard() {
    board.innerHTML = "";

    const position = chess.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {

            const square = document.createElement("div");

            const squareName = "abcdefgh"[col] + (8 - row);

            square.classList.add("square");

            if ((row + col) % 2 === 0) {
                square.classList.add("light-square");
            } else {
                square.classList.add("dark-square");
            }

            if (selectedSquare === squareName) {
                square.classList.add("selected-square");
            }

            if (checkFlashSquare === squareName) {
                square.classList.add("check-king");
            }

            if (possibleMoves.includes(squareName)) {
                square.classList.add("possible-move");
            }

            const piece = position[row][col];

            if (piece) {
                const symbol = piece.color + piece.type;

                const pieceElement = document.createElement("span");

                pieceElement.className = "piece " +
                    (piece.color === "w" ? "white-piece" : "black-piece");

                pieceElement.textContent = pieces[symbol];

                square.appendChild(pieceElement);
            }

            // Обработчик клика для каждой клетки
            square.addEventListener("click", () => {
                handleSquareClick(squareName);
            });

            board.appendChild(square);
        }
    }

    updateGameInfo();

    // Окно окончания партии
    if (chess.game_over()) {

        const result = document.createElement("div");
        result.className = "game-result";

        let message;

        if (chess.in_checkmate()) {
            message = chess.turn() === "w"
                ? "🏆 Чёрные победили!"
                : "🏆 Белые победили!";
        } else {
            message = "🤝 Ничья!";
        }

        result.innerHTML = `
            <div class="result-box">
                <h2>${message}</h2>
                <p>Партия завершена</p>
            </div>
        `;

        board.appendChild(result);
    }
}

// Обработка ходов
function handleSquareClick(square) {

    if (chess.game_over()) return;

    const piece = chess.get(square);

    if (selectedSquare) {

        const move = chess.move({
            from: selectedSquare,
            to: square,
            promotion: "q"
        });

        if (move) {

            selectedSquare = null;
            possibleMoves = [];

            if (checkFlashTimer) {
                clearTimeout(checkFlashTimer);
            }

            checkFlashSquare = null;

            // Если объявлен шах
            if (chess.in_check()) {

                checkFlashSquare = findKingSquare(chess.turn());

                checkFlashTimer = setTimeout(() => {
                    checkFlashSquare = null;
                    checkFlashTimer = null;
                    drawBoard();
                }, 3000);
            }

            drawBoard();
            return;
        }
    }

    // Выбор своей фигуры
    if (piece && piece.color === chess.turn()) {

        selectedSquare = square;

        possibleMoves = chess.moves({
            square: square,
            verbose: true
        }).map(move => move.to);

    } else {

        selectedSquare = null;
        possibleMoves = [];
    }

    drawBoard();
}

// Информация о партии
function updateGameInfo() {

    if (chess.turn() === "w") {
        turnInfo.textContent = "Ход белых";
    } else {
        turnInfo.textContent = "Ход чёрных";
    }

    if (chess.in_checkmate()) {

        gameStatus.textContent = "Мат!";

    } else if (chess.in_draw()) {

        gameStatus.textContent = "Ничья!";

    } else if (chess.in_check()) {

        gameStatus.textContent = "Шах!";

    } else {

        gameStatus.textContent = "Партия продолжается";
    }
}

// Новая партия
function restartGame() {

    chess.reset();

    selectedSquare = null;
    possibleMoves = [];
    checkFlashSquare = null;

    if (checkFlashTimer) {
        clearTimeout(checkFlashTimer);
        checkFlashTimer = null;
    }

    drawBoard();
}

// Запуск
drawBoard();
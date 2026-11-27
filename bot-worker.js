importScripts("https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js");

const VALUES = {
    p: 100,
    n: 320,
    b: 335,
    r: 500,
    q: 900,
    k: 20000
};

let chess;
let botColor;
let deadline;
let stopped = false;

function evaluate() {
    if (chess.in_checkmate()) {
        return chess.turn() === botColor ? -100000 : 100000;
    }

    if (chess.in_draw()) return 0;

    let score = 0;
    const board = chess.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            let value = VALUES[piece.type];

            // Контроль центра
            const centerDistance =
                Math.abs(3.5 - c) + Math.abs(3.5 - r);

            if (piece.type === "p") {
                const advance = piece.color === "w"
                    ? 6 - r
                    : r - 1;

                value += advance * 7;
            }

            if (piece.type === "n" || piece.type === "b") {
                value += Math.max(0, 7 - centerDistance * 2) * 5;
            }

            if (piece.type === "q") {
                value += Math.max(0, 5 - centerDistance) * 2;
            }

            score += piece.color === botColor ? value : -value;
        }
    }

    return score;
}

function sortMoves(moves) {
    return moves.sort((a, b) => {
        const scoreA =
            (a.captured ? VALUES[a.captured] : 0) * 10 +
            (a.promotion ? VALUES[a.promotion] : 0) +
            (a.san.includes("+") ? 50 : 0) +
            (a.san.includes("#") ? 10000 : 0);

        const scoreB =
            (b.captured ? VALUES[b.captured] : 0) * 10 +
            (b.promotion ? VALUES[b.promotion] : 0) +
            (b.san.includes("+") ? 50 : 0) +
            (b.san.includes("#") ? 10000 : 0);

        return scoreB - scoreA;
    });
}

function checkTime() {
    if (performance.now() >= deadline) {
        stopped = true;
        throw new Error("TIME_LIMIT");
    }
}

function search(depth, alpha, beta, ply) {
    checkTime();

    if (chess.game_over()) {
        if (chess.in_checkmate()) {
            return chess.turn() === botColor
                ? -100000 + ply
                : 100000 - ply;
        }

        return 0;
    }

    if (depth === 0) {
        return evaluate();
    }

    const maximizing = chess.turn() === botColor;
    const moves = sortMoves(chess.moves({ verbose: true }));

    let best = maximizing ? -Infinity : Infinity;

    for (const move of moves) {
        checkTime();

        chess.move(move);

        const score = search(
            depth - 1,
            alpha,
            beta,
            ply + 1
        );

        chess.undo();

        if (maximizing) {
            best = Math.max(best, score);
            alpha = Math.max(alpha, best);
        } else {
            best = Math.min(best, score);
            beta = Math.min(beta, best);
        }

        if (beta <= alpha) break;
    }

    return best;
}

function findBestMove(fen, color, level) {
    chess = new Chess();

    if (!chess.load(fen)) {
        return null;
    }

    botColor = color;
    stopped = false;

    const settings = {
        3: { time: 600, depth: 3 },
        4: { time: 1100, depth: 5 },
        5: { time: 1800, depth: 7 }
    };

    const config = settings[level] || settings[3];

    deadline = performance.now() + config.time;

    const moves = sortMoves(chess.moves({ verbose: true }));

    if (!moves.length) return null;

    let bestMove = moves[0];
    let completedDepth = 0;

    // Итеративный поиск: сохраняем лучший завершённый результат
    for (let depth = 1; depth <= config.depth; depth++) {
        let currentBest = null;
        let currentScore = -Infinity;

        try {
            for (const move of moves) {
                checkTime();

                chess.move(move);

                const score = search(
                    depth - 1,
                    -Infinity,
                    Infinity,
                    1
                );

                chess.undo();

                if (score > currentScore) {
                    currentScore = score;
                    currentBest = move;
                }
            }

            if (currentBest) {
                bestMove = currentBest;
                completedDepth = depth;
            }

        } catch (error) {
            if (error.message !== "TIME_LIMIT") {
                throw error;
            }

            break;
        }
    }

    return {
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || "q",
        depth: completedDepth
    };
}

self.onmessage = function(event) {
    try {
        const result = findBestMove(
            event.data.fen,
            event.data.color,
            event.data.level
        );

        self.postMessage({ move: result });

    } catch (error) {
        self.postMessage({
            move: null,
            error: error.message
        });
    }
};

const game = new Chess();
let board = Chessboard("board", {
  position: "start",
  draggable: true,
  onDrop: handleMove,
  showNotation: true,
  pieceTheme: "https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png",
  onMouseoutSquare: clearHighlights,
  onMouseoverSquare: showLegalMoves,
  orientation: "white",
});

function updateStatus() {
  const statusElement = document.getElementById("status");
  const undoBtn = document.getElementById("undoBtn");
  undoBtn.disabled = game.history().length === 0;

  if (game.in_checkmate()) {
    statusElement.innerHTML = `Checkmate! ${
      game.turn() === "w" ? "Black" : "White"
    } wins!`;
  } else if (game.in_draw()) {
    statusElement.innerHTML = "Game drawn!";
  } else {
    statusElement.innerHTML = `${
      game.turn() === "w" ? "White" : "Black"
    }'s turn`;
    if (game.in_check()) {
      statusElement.innerHTML += " (Check!)";
    }
  }
}

async function handleMove(source, target) {
  try {
    const move = game.move({ from: source, to: target, promotion: "q" });

    if (move === null) {
      console.log("Illegal move, undoing...");
      game.undo();
      updateBoard();
      updateStatus();

      alert("Illegal move! Please try again.");
      return;
    }

    updateBoard();
    updateStatus();

    if (game.game_over()) return;

    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fen: game.fen() }),
    });

    console.log("api res", response);

    if (!response.ok) {
      throw new Error(`res err: ${response.status}`);
    }

    const data = await response.json();
    console.log("parsed res", data);

    if (data.move) {
      const aiMove = data.move;
      const from = aiMove.slice(0, 2);
      const to = aiMove.slice(2, 4);

      const moveObj = {
        from: from,
        to: to,
        promotion: "q",
      };

      if (game.move(moveObj)) {
        console.log("move", aiMove);
        setTimeout(() => {
          board.position(game.fen());
          updateStatus();
        }, 500);
      } else {
        console.error("res", aiMove);
      }
    } else {
      console.error("res", data);
    }
  } catch (error) {
    console.error("err", error);
    document.getElementById("status").innerHTML = "model failed";
  }
}

function updateBoard() {
  clearHighlights();
  if (game.history().length > 0) {
    const lastMove = game.history({ verbose: true })[game.history().length - 1];
    highlightSquare(lastMove.from);
    highlightSquare(lastMove.to);
  }
  board.position(game.fen());
}

function highlightSquare(square) {
  $(`#board .square-${square}`).addClass("highlight");
}

function clearHighlights() {
  $("#board .square").removeClass("highlight");
}

function showLegalMoves(square) {
  const moves = game.moves({ square, verbose: true });
  moves.forEach((move) => highlightSquare(move.to));
}

function resetGame() {
  game.reset();
  board.start();
  updateStatus();
}

function undoMove() {
  if (game.history().length >= 1) game.undo();
  if (game.history().length >= 1) game.undo();
  updateBoard();
  updateStatus();
}

updateStatus();

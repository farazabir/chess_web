from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import onnxruntime as ort
import pickle
from chess import Board
from .utils import fen_to_input

app = FastAPI()

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and mappings
ort_session = ort.InferenceSession("chess_model.onnx")
with open("move_to_int.pkl", "rb") as f:
    move_to_int = pickle.load(f)
int_to_move = {v: k for k, v in move_to_int.items()}

class MoveRequest(BaseModel):
    fen: str

@app.post("/predict")
async def predict_move(request: MoveRequest):
    try:
        # Validate and process input
        input_array = fen_to_input(request.fen)
        
        # ONNX inference
        outputs = ort_session.run(
            None, 
            {'input': input_array.astype(np.float32)}
        )
        logits = outputs[0][0]
        
        # Get legal moves
        board = Board(request.fen)
        legal_moves = {move.uci() for move in board.legal_moves}
        
        # Find top valid move
        sorted_moves = np.argsort(logits)[::-1]
        for move_idx in sorted_moves:
            move = int_to_move.get(move_idx)
            if move in legal_moves:
                return {"move": move}
        
        # Fallback to first legal move if no valid predictions
        return {"move": next(iter(legal_moves), None)}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
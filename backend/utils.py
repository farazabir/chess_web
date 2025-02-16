import numpy as np
from chess import Board

def board_to_matrix(board: Board) -> np.ndarray:
    """Convert chess board to 13x8x8 matrix matching training format"""
    matrix = np.zeros((13, 8, 8), dtype=np.float32)
    
    # Piece layers (6 white, 6 black)
    for square, piece in board.piece_map().items():
        row, col = divmod(square, 8)
        layer = (piece.piece_type - 1) + (0 if piece.color else 6)
        matrix[layer, row, col] = 1
    
    # Legal moves layer
    for move in board.legal_moves:
        row, col = divmod(move.to_square, 8)
        matrix[12, row, col] = 1
        
    return matrix

def fen_to_input(fen: str) -> np.ndarray:
    """Convert FEN string to ONNX-compatible input"""
    board = Board(fen)
    if not board.is_valid():
        raise ValueError("Invalid FEN")
    matrix = board_to_matrix(board)
    return np.expand_dims(matrix, axis=0)  
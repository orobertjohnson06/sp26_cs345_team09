class Box {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }
}

class Piece {
    static SHAPES = {
        "4Line" : {color: "lightblue", cells: [[0,0],[0,1],[0,2],[0,3]]},
        "L" : {color: "orange", cells: [[0,0],[1,0],[2,0],[2,1]]},
        "BackL" : {color: "blue", cells: [[0,1],[1,1],[2,0],[2,1]]},
        "T" : {color: "purple", cells: [[0,0],[0,1],[0,2],[1,1]]},
        "S" : {color: "green", cells: [[0,1],[0,2],[1,0],[1,1]]},
        "Z" : {color: "red", cells: [[0,0],[0,1],[1,1],[1,2]]},
        "2by2" : {color: "yellow", cells: [[0,0],[0,1],[1,0],[1,1]]},
    };
    constructor(x, y, type, boxSize = 32) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.boxSize = boxSize;
        this.rotation = 0;
        const shape = Piece.SHAPES[type];
        this.color = shape.color;
        this.boxes = shape.cells.map(([row, col]) =>
            new Box(
                x + col * boxSize,
                y + row * boxSize,
                boxSize
            )
        );
    }

    static rotateCells(cells) {
        const rotated = cells.map(([row, col]) => [col, -row]);
        //corrects for pieces going off board
        const minRow  = Math.min(...rotated.map(([r]) => r));
        const minCol  = Math.min(...rotated.map(([, c]) => c));
        return rotated.map(([r, c]) => [r - minRow, c - minCol]);
    }

    rotate(boardCols, boardRows, originX, originY, board) {
        let cells = Piece.SHAPES[this.type].cells;
        for (let i = 0; i < this.rotation; i++)
            cells = Piece.rotateCells(cells);
        const nextCells = Piece.rotateCells(cells);
        for (const [row, col] of nextCells) {
            const newX = this.x + col * this.boxSize;
            const newY = this.y + row * this.boxSize;
            //bounds check
            if (newX < originX || newX + this.boxSize > originX + boardCols * this.boxSize) return false;
            if (newY < originY || newY + this.boxSize > originY + boardRows * this.boxSize) return false;
            //board collision check
            const boardCol = Math.round((newX - originX) / this.boxSize);
            const boardRow = Math.round((newY - originY) / this.boxSize);
            if (boardRow >= 0 && boardRow < boardRows &&
                boardCol >= 0 && boardCol < boardCols &&
                board[boardRow][boardCol] !== null) return false;
        }
        this.rotation = (this.rotation + 1) % 4;
        this.boxes = nextCells.map(([row, col]) =>
            new Box(
                this.x + col * this.boxSize,
                this.y + row * this.boxSize,
                this.boxSize
            )
        );
        return true;
    }

    move(x, y) {
        this.x += x;
        this.y += y;
        this.boxes.forEach(box => {
            box.x += x;
            box.y += y;
        });
    }
}
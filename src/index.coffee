prompt = require("prompt-sync")({ sigint: true })

DEFAULT_COMMAND = 'q'
MENU_TEXT = """___ Commands ___
    1 2 3
    4 5 6  Play square corresponding to number.
    7 8 9
        R  Play random square.             (TODO)
        H  Play square using heuristic AI. (TODO)
        Q  Quit.                           [Default]\n"""
WIN_ROWS = [ [1, 2, 3], [4, 5, 6], [7, 8, 9], [1, 4, 7], [2, 5, 8], [3, 6, 9], [1, 5, 9], [7, 5, 3] ]

print = (s) -> output += "#{s}\n"

# Convert player number to symbol. Odds are O, evens are X.
symbol = (player) -> if player % 2 then 'O' else 'X'

renderBoard = (board) -> """
    \ #{board[1]} | #{board[2]} | #{board[3]}\n---+---+---
    \ #{board[4]} | #{board[5]} | #{board[6]}\n---+---+---
    \ #{board[7]} | #{board[8]} | #{board[9]}\n"""

checkWinner = (board) ->
    for r in WIN_ROWS
        winner = board[r[0]]
        if (winner isnt ' ') and (board[r[1]] is winner) and (board[r[2]] is winner)
            return winner
    return false

# Current turn. Current player = turn % 2.
turn = 1

# The board is just an array of 9 values. 0-index is not used. (1-indexed board!)
board = new Array(10).fill ' '

input = command = output = ''

`MAINLOOP: // For nested break.`
while true
    process.stdout.write('\u001b[2J\u001b[0;0H')  # Clear terminal and move cursor to 0,0
    console.log renderBoard(board)

    if input   then console.log "You entered: #{input}"
    if command then console.log "Running command: #{command}\n"

    if gameOverMessage
        console.log gameOverMessage
        break

    console.log output
    output = ''

    console.log MENU_TEXT
    input = prompt "Turn #{turn}. Enter command for player #{symbol turn % 2}: "
    command = input.trim().toLowerCase()[0] or DEFAULT_COMMAND

    position = false
    switch
        when command in '123456789'
            position = command
        when command is 'r', command is 'h'
            print 'Command not implemented yet!'
        when command is 'q'
            `break MAINLOOP`
        else
            print 'Unknown command.'

    if position
        if board[position] isnt ' '
            print 'That square has already been played.'
        else
            board[position] = symbol turn % 2
            if winner = checkWinner board
                gameOverMessage = "Player #{winner} wins!"
            else if turn > 8  # No more moves left.
                gameOverMessage = "Tie game!"
            turn++

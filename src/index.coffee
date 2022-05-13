prompt = require("prompt-sync")({ sigint: true })

DEFAULT_COMMAND = 'q'

MENU_TEXT = """
    ___ Commands ___
    1 2 3
    4 5 6  Play square corresponding to number.
    7 8 9
        R  Play random square.             (TODO)
        H  Play square using heuristic AI. (TODO)
        Q  Quit.                           [Default]\n
    """
WIN_ROWS = [
    [1, 2, 3]
    [4, 5, 6]
    [7, 8, 9]
    [1, 4, 7]
    [2, 5, 8]
    [3, 6, 9]
    [1, 5, 9]
    [7, 5, 3]
]

print = (s) -> output += "#{s}\n"

renderBoard = (board) ->
    rendering =  " #{symbol board[1]} | #{symbol board[2]} | #{symbol board[3]}\n"
    rendering += '---+---+---\n'
    rendering += " #{symbol board[4]} | #{symbol board[5]} | #{symbol board[6]}\n"
    rendering += '---+---+---\n'
    rendering += " #{symbol board[7]} | #{symbol board[8]} | #{symbol board[9]}\n"

checkWinner = (board) ->
    for r in WIN_ROWS
        winner = board[r[0]]
        if winner isnt 0 and board[r[1]] is winner and board[r[2]] is winner
            return winner
    return false

# Current turn
turn = 1

# Current player
player = 1

# The board is just an array of 9 values defined below.
# 0 index is not used.
board = new Array(10).fill 0
board[0] = null

# Convert board value to symbol:
# Empty squares are 0.
# O squares are 1 (odd).
# X squares are 2 (even).
symbol = (player) ->
    switch
        when player is null then '!'  # This should not happen!
        when player is 0    then ' '
        when player % 2     then 'O'
        else 'X'

input = ''
command = ''
output = ''
winner = null

done = false

while not done
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
    input = prompt "Turn #{turn}. Enter command for player #{symbol player}: "
    command = input.trim().toLowerCase()[0] or DEFAULT_COMMAND

    if command in '123456789'
        if board[command] is 0
            board[command] = player
            if winner = checkWinner board
                gameOverMessage = "Player #{symbol winner} wins!"
            else if turn > 8  # No more moves left.
                gameOverMessage = "Tie game!"


            player = 3-player  # Switches players.
            turn++
        else
            print "That square has already been played.\n"

    if command is 'q' then done = true

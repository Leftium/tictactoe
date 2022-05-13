prompt = require("prompt-sync")({ sigint: true })

print = (s) -> output += "#{s}\n"

renderBoard = (board) ->
    output =  " #{symbol board[1]} | #{symbol board[2]} | #{symbol board[3]}\n"
    output += '---+---+---\n'
    output += " #{symbol board[4]} | #{symbol board[5]} | #{symbol board[6]}\n"
    output += '---+---+---\n'
    output += " #{symbol board[7]} | #{symbol board[8]} | #{symbol board[9]}\n"

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
# O squares are 1 (odd)
# X squares are 2 (even)
symbol = (player) ->
    switch
        when player is null then '!'  # This should not happen!
        when player is 0    then ' '
        when player % 2     then 'O'
        else 'X'

input = ''
command = ''
output = ''

done = false

while not done
    process.stdout.write('\u001b[2J\u001b[0;0H')  # Clear terminal and move cursor to 0,0
    console.log "Turn #{turn}\n"
    console.log renderBoard(board)

    if input   then console.log "You entered #{input}"
    if command then console.log "The command is: #{command}"

    console.log output
    output = ''

    console.log """
        ___ Menu ___
        1 2 3
        4 5 6  Play square corresponding to number.
        7 8 9
            Q  Quit

        """
    input = prompt "Enter command for player #{symbol player}: "
    command = input.trim().toLowerCase()[0]

    if command in '123456789'
        if board[command] is 0
            board[command] = player
            player = 3-player  # Switches players.
            turn++
        else
            print "That square has already been played.\n"

    if command is 'q' then done = true

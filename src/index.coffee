prompt = require("prompt-sync")({ sigint: true })

input = ''
output = ''
done = false;

while not done
    process.stdout.write('\u001b[2J\u001b[0;0H')  # Clear terminal and move cursor to 0,0
    console.log output
    console.log """
        \n___ Menu ___
        Q: quit

        """
    input = prompt ('enter an option: ').toLowerCase()
    output = "You entered #{input}"

    done = input[0] is 'q'

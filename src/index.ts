import _ from 'lodash'

import debugFactory from 'debug'
const log = debugFactory('log')

import promptFactory from 'prompt-sync'
const prompt = promptFactory({ sigint: true })

type Position = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

type Row = [Position, Position, Position]

const ROWS: Row[] = [
	[1, 2, 3],
	[4, 5, 6],
	[7, 8, 9],
	[1, 4, 7],
	[2, 5, 8],
	[3, 6, 9],
	[1, 5, 9],
	[3, 5, 7],
]

type Player = 'x' | 'o'

type TicTacToeSquare = Player | '_'

// A Board is a '#' followed by 9 TicTacToeSquares.
type Board = [
	'#', // Fills 0 index for 1-based indexing.
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare,
	TicTacToeSquare
]

function boardFromString(string: string): Board {
	const normalizedString = string
		.replace(/[^XxOo_]/g, '')
		.padEnd(9, '_')
		.substring(0, 9)
	return ['#'].concat(normalizedString.split('')) as Board
}

// The Board contains everything we need to know about the game state;
// other properties are derived for convenience.
// idea: restrict values for counts, turnNumber
type BoardDetails = {
	board: Board
	counts: {
		x: number
		o: number
		_: number
	}
	turnNumber: number
	currentPlayer: Player
	validMoves: Position[]
	winningRows: Row[]
}

// question: worth adding .type? (state, effect, etc...)
type EsEvent = {
	name: string
	data: unknown
}

type EventDataMoved = {
	position: Position
	player: Player
}

type EventDataSet = {
	board: string
}

type RowDetails = {
	row: Row
	emo: number
	value: number
}

type PositionDetails = {
	position: Position
	score: number
	emos: number[]
}

const MOVE_MENU_TEXT = `1 2 3
4 5 6  [1-9] Make move corresponding to square
7 8 9
       [R]andom square   [Default]
       [H]euristic AI    (TODO)`

const GAME_MENU_TEXT = `       [U]ndo last move  (TODO)
       [N]ew Game
       [Q]uit\n`

const DEFAULT_COMMAND = 'r'
const PROMPT =
	'Enter command ' +
	'(1-9/r/h/u/n/q): '.replace(DEFAULT_COMMAND, DEFAULT_COMMAND.toUpperCase())

const INITIAL_BOARD = boardFromString('___ ___ ___')

let events: EsEvent[] = []
let newEvents: EsEvent[]

let input = ''
let resultText = ''

function makeEvent(name: string, data?: unknown) {
	return { name, data }
}

function replaceAt(board: Board, index: Position, replacement: Player): Board {
	const newBoard: Board = [...board]
	newBoard[index] = replacement
	return newBoard
}

// Split input into command and params.
function parseInput(input: string) {
	const inputChars = input.trim().toLowerCase().split('')
	const inputWords = input.trim().toLowerCase().split(' ')

	let command = inputChars[0] || DEFAULT_COMMAND
	let params =
		inputWords.length > 1
			? inputWords.slice(1).join(' ')
			: inputChars.slice(1).join('')

	if ('123456789'.includes(command)) {
		params = command
		command = 'm'
	}
	return { command, params }
}

function renderBoard(board: Board, line1 = '', line2 = '', line3 = '') {
	const b = board.map((item) => (item === '_' ? ' ' : item))
	return (
		` ${b[1]} | ${b[2]} | ${b[3]}      ${line1}\n---+---+---\n` +
		` ${b[4]} | ${b[5]} | ${b[6]}      ${line2}\n---+---+---\n` +
		` ${b[7]} | ${b[8]} | ${b[9]}      ${line3}`
	)
}

// Derive useful info about game state from a Board.
function getDetails(board: Board): BoardDetails {
	const counts = {
		x: board.filter((square) => square == 'x').length,
		o: board.filter((square) => square == 'o').length,
		_: board.filter((square) => square == '_').length,
	}

	const turnNumber = 10 - counts._

	const currentPlayer = (turnNumber % 2 ? 'x' : 'o') as Player

	const winningRows = ROWS.filter((row) => {
		return (
			board[row[0]] !== '_' &&
			board[row[0]] === board[row[1]] &&
			board[row[0]] === board[row[2]]
		)
	})

	const validMoves = winningRows.length
		? []
		: board.reduce(
				(moves: Position[], square, index) =>
					square === '_' ? [...moves, index as Position] : moves,
				[]
		  )

	return {
		board,
		counts,
		turnNumber,
		currentPlayer,
		validMoves,
		winningRows,
	}
}

const randomMove = (validMoves: Position[]) => {
	return _.sample(validMoves)
}

/* Value of row based on count of players:
    EMO = Empty Mine Opponent
    120: 1_000_000, // Win
    102:   100_000, // Block win
    210:    10_000, // Almost win
    201:     1_000, // Block almost win
    300:       100, // Open
    111:        10, // Blocked
    021:         1, // No move
    012:         1, // No move
    030:         1, // No move
    003:         1, // No move
*/
const heuristicAiMove = (boardDetails: BoardDetails): Position | undefined => {
	// For each Row:
	//     Compute EMO/value.
	//     For each Position in Row:
	//         Add row.value to PositionDetails[position].score.

	// If not first move: (first move always random to make more interesting)
	//     Filter out low-scoring positions.
	// Sample from remaining positions.

	const positionDetails: PositionDetails[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
		(position) => ({
			position: position as Position,
			score: 0,
			emos: [],
		})
	)

	const rowDetails: RowDetails[] = ROWS.map((row) => ({
		row,
		emo: 0,
		value: 0,
	}))

	// TODO: Fill details in.

	log('C. heuristicAiMove')
	log(rowDetails)
	log(positionDetails)
	log(boardDetails)

	return undefined
}

// question: naming convention for events?
function processInput(input: string, events: EsEvent[]) {
	let newEvents = [...events]

	const boardDetails: BoardDetails = getDetails(boardFromEvents(events))

	const { command, params } = parseInput(input)

	function processMove(position: Position | undefined, memo: string) {
		const newEvents = []

		const player: Player = boardDetails.currentPlayer
		if (position && boardDetails.validMoves.includes(position)) {
			newEvents.push(makeEvent('moved', { player, position, memo }))
		} else {
			newEvents.push(
				makeEvent('got-invalid-move', {
					player,
					position,
					memo: 'invalid',
				})
			)
		}
		return newEvents
	}

	switch (command) {
		case 'q':
			newEvents.push(makeEvent('got-quit'))
			break

		case 'n':
			newEvents.push(makeEvent('started-new-game'))
			break

		case 'm':
			newEvents = processMove(parseInt(params, 10) as Position, 'move')
			break

		case 'r':
			newEvents = processMove(
				randomMove(boardDetails.validMoves),
				'random'
			)
			break

		case 'h':
			newEvents = processMove(
				heuristicAiMove(boardDetails),
				'heuristic-ai'
			)
			break

		case 'u':
			newEvents.push(
				makeEvent('got-command-not-implemented', { command })
			)
			break

		case 's':
			newEvents.push(makeEvent('board-set', { board: params }))
			break

		default:
			newEvents.push(makeEvent('got-command-unknown', { command }))
	}
	return newEvents
}

function boardFromEvents(events: EsEvent[]): Board {
	let board = INITIAL_BOARD

	for (const event of events) {
		if (event.name === 'moved') {
			board = replaceAt(
				board,
				(event.data as EventDataMoved).position,
				(event.data as EventDataMoved).player
			)
		}

		if (event.name === 'started-new-game') {
			board = INITIAL_BOARD
		}

		if (event.name === 'board-set') {
			board = boardFromString((event.data as EventDataSet).board)
		}
	}
	return board
}

// eslint-disable-next-line no-constant-condition
MAINLOOP: while (true) {
	if (!process.env.DEBUG) {
		process.stdout.write('\u001b[2J\u001b[0;0H') // Clear terminal and move cursor to 0,0
	}

	// log('A. events: %O', events)
	const boardDetails = getDetails(boardFromEvents(events))
	// log('B. boardDetails: %O', boardDetails)

	let gameStatus = `Turn ${
		boardDetails.turnNumber
	}: Player ${boardDetails.currentPlayer.toUpperCase()}`

	const lastInput = input ? `Last input: ${input}` : ''

	let menuText = `\n${'______ Commands '.padEnd(80, '_')}\n`
	if (boardDetails.validMoves.length) {
		menuText = `${menuText}${MOVE_MENU_TEXT}\n\n${GAME_MENU_TEXT}`
	} else {
		menuText = `${menuText}${GAME_MENU_TEXT}`
		if (boardDetails.winningRows.length) {
			const winningPlayer =
				boardDetails.board[boardDetails.winningRows[0][0]]
			gameStatus = `Player ${winningPlayer} won!`
		} else {
			gameStatus = 'Tie game...'
		}
	}

	console.log()
	console.log(
		renderBoard(boardDetails.board, gameStatus, lastInput, resultText)
	)
	console.log(menuText)
	input = prompt(PROMPT)
	newEvents = processInput(input, events)
	events = [...events, ...newEvents]

	resultText = ''

	for (const event of newEvents) {
		switch (event.name) {
			case 'got-quit':
				break MAINLOOP

			case 'got-invalid-move':
				resultText = `Invalid move!`
				break

			case 'got-command-not-implemented':
				resultText = `Sorry~ Not implemented yet!`
				break

			case 'moved':
				resultText = `Player ${(
					event.data as EventDataMoved
				).player.toUpperCase()} played square ${
					(event.data as EventDataMoved).position
				}`
				break
			default:
				log('Unknown event: %o', event)
		}
	}
}

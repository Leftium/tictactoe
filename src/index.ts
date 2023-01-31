import _ from 'lodash'

import debugFactory from 'debug'
const log = debugFactory('log')

import promptFactory from 'prompt-sync'
const prompt = promptFactory({ sigint: true })

// Prevent lodash from being treeshaken out.
log('Lodash: %s', _.VERSION)

const MOVE_MENU_TEXT = `1 2 3
4 5 6  [1-9] Make move corresponding to square
7 8 9
       [R]andom square   (TODO)
       [H]euristic AI    (TODO)`

const GAME_MENU_TEXT = `       [U]ndo last move  (TODO)
       [N]ew Game
       [Q]uit            [Default]\n`

const DEFAULT_COMMAND = 'q'

// A string with 3 positions.
type Row = '123' | '456' | '789' | '147' | '258' | '369' | '159' | '357'

const ROWS: Row[] = ['123', '456', '789', '147', '258', '369', '159', '357']

// A Board is a '#' followed by 9 characters in the set [XxOo_].
type Board = string

type Player = 'x' | 'o'

// The Board contains everything we need to know about the game state;
// other properties are derived for convenience.
type BoardDetails = {
	board: Board
	counts: {
		x: number
		o: number
		_: number
	}
	turnNumber: number
	currentPlayer: Player
	validMoves: number[]
	winningRows: Row[]
}

type EsEvent = {
	name: string
	data: unknown
}

function makeEvent(name: string, data?: unknown) {
	return { name, data }
}

function replaceAt(s: string, index: number, replacement: string) {
	return s.substring(0, index) + replacement + s.substring(index + 1)
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

const INITIAL_BOARD = '___ ___ ___'

// 1. Strip insignificant characters.
// 2. Lower case.
// 3. Prepend # so positions match array indices.
function normalizeBoard(board: Board) {
	return (
		'#' +
		board
			.replace(/[^xXoO_]/g, '')
			.toLowerCase()
			.padEnd(9, '_')
	)
}

// For output in nice standard format.
function prettyBoard(board: Board) {
	return normalizeBoard(board).slice(1).replace(/.../g, '$& ').slice(0, -1)
}

function renderBoard(board: Board, line1 = '', line2 = '', line3 = '') {
	const b = normalizeBoard(board).replace(/_/g, ' ')
	return (
		` ${b[1]} | ${b[2]} | ${b[3]}      ${line1}\n---+---+---\n` +
		` ${b[4]} | ${b[5]} | ${b[6]}      ${line2}\n---+---+---\n` +
		` ${b[7]} | ${b[8]} | ${b[9]}      ${line3}`
	)
}

// Derive useful info about game state from simple string representation of board.
function getDetails(boardOrState: Board | BoardDetails) {
	if (typeof boardOrState !== 'string') {
		return boardOrState as BoardDetails
	}

	const board = normalizeBoard(boardOrState)

	const counts = {
		x: (board.match(/x/g) || []).length,
		o: (board.match(/o/g) || []).length,
		_: (board.match(/_/g) || []).length,
	}

	const turnNumber = 10 - counts._

	const currentPlayer = (turnNumber % 2 ? 'x' : 'o') as Player

	const winningRows = ROWS.filter((row) => {
		const intRow = row.split('').map((c) => parseInt(c, 10))
		return (
			board[intRow[0]] !== '_' &&
			board[intRow[0]] === board[intRow[1]] &&
			board[intRow[0]] === board[intRow[2]]
		)
	})

	const validMoves = winningRows.length
		? []
		: ([...board.matchAll(/_/g)] || []).map((match) => match.index)

	return {
		board: prettyBoard(board),
		counts,
		turnNumber,
		currentPlayer,
		validMoves,
		winningRows,
	}
}

function processMove(position: number, board: Board) {
	const result = {
		board,
		events: [] as EsEvent[],
	}
	const boardDetails = getDetails(board)

	const player: Player = boardDetails.currentPlayer
	if (boardDetails.validMoves.includes(position)) {
		result.board = replaceAt(normalizeBoard(result.board), position, player)
		result.events.push(makeEvent('moved', { player, position }))

		const nextState = getDetails(result.board)
		const winningRows = nextState.winningRows
		if (winningRows.length) {
			result.events.push(
				makeEvent('game-won', {
					player,
					winningRows,
				})
			)
		} else if (!nextState.validMoves.length) {
			result.events.push(makeEvent('game-tied'))
		}
	} else {
		result.events.push(makeEvent('got-invalid-move', { player, position }))
	}
	return result
}

function processInput(input: string, board: Board) {
	let result = {
		board,
		events: [] as EsEvent[],
	}

	const { command, params } = parseInput(input)

	switch (command) {
		case 'q':
			result.events.push(makeEvent('got-quit'))
			break

		case 'n':
			result.board = ''
			result.events.push(makeEvent('started-new-game'))
			break

		case 'm':
			result = processMove(parseInt(params, 10), board)
			break

		case 'r':
		case 'u':
		case 'h':
			result.events.push(
				makeEvent('got-command-not-implemented', { command })
			)
			break

		case 's':
			result.board = input
			result.events.push(makeEvent('board-set', { board: params }))
			break

		default:
			result.events.push(makeEvent('got-command-unknown', { command }))
	}
	return result
}

let board = INITIAL_BOARD

let input = ''

let resultText = ''

// eslint-disable-next-line no-constant-condition
MAINLOOP: while (true) {
	process.stdout.write('\u001b[2J\u001b[0;0H') // Clear terminal and move cursor to 0,0

	const boardDetails = getDetails(board)
	log('boardDetails: %O', boardDetails)

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
				board[parseInt(boardDetails.winningRows[0][0])].toUpperCase()
			gameStatus = `Player ${winningPlayer} won!`
		} else {
			gameStatus = 'Tie game...'
		}
	}

	console.log()
	console.log(renderBoard(board, gameStatus, lastInput, resultText))
	console.log(menuText)
	input = prompt('Enter command (1-9/r/h/u/n/Q): ')
	const result = processInput(input, boardDetails.board)

	resultText = ''
	for (const event of result.events) {
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
				resultText = `Player ${event.data.player.toUpperCase()} played square ${
					event.data.position
				}`
				break
			default:
				log('Unknown event: %o', event)
		}
	}
	board = result.board
}

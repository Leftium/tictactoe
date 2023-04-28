import _ from 'lodash'

import debugFactory from 'debug'
const log = debugFactory('log')

import promptFactory from 'prompt-sync'
const prompt = promptFactory({ sigint: true })

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

type Position = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

// A string with 3 positions.
type Row = '123' | '456' | '789' | '147' | '258' | '369' | '159' | '357'

const ROWS: Row[] = ['123', '456', '789', '147', '258', '369', '159', '357']

// A Board is a '#' followed by 9 characters in the set [XxOo_].
type Board = string

const INITIAL_BOARD = '___ ___ ___'

// idea: define more strict type NormalizedBoard.
// idea: define const PLAYER_X, PLAYER_O

type Player = 'x' | 'o'

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
	validMoves: number[]
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
	board: Board
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
function getDetails(boardOrState: Board | BoardDetails): BoardDetails {
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
		// Computer-friendly array from human-friendly string:
		const intRow = row.split('').map((c) => parseInt(c, 10))
		return (
			board[intRow[0]] !== '_' &&
			board[intRow[0]] === board[intRow[1]] &&
			board[intRow[0]] === board[intRow[2]]
		)
	})

	const validMoves = (
		winningRows.length
			? []
			: ([...board.matchAll(/_/g)] || []).map((match) => match.index)
	) as number[]

	return {
		board: prettyBoard(board),
		counts,
		turnNumber,
		currentPlayer,
		validMoves,
		winningRows,
	}
}

// question: naming convention for events?
function processInput(input: string, events: EsEvent[]) {
	let newEvents = [...events]

	const boardDetails: BoardDetails = getDetails(boardFromEvents(events))

	const { command, params } = parseInput(input)

	function processMove(position: Position | undefined, type: string) {
		const newEvents = []

		const player: Player = boardDetails.currentPlayer
		if (position && boardDetails.validMoves.includes(position)) {
			newEvents.push(makeEvent('moved', { player, position, type }))
		} else {
			newEvents.push(
				makeEvent('got-invalid-move', {
					player,
					position,
					type: 'invalid',
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
				_.sample(boardDetails.validMoves) as Position | undefined,
				'random'
			)
			break

		case 'u':
		case 'h':
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
	log('boardFromEvents %O', events)

	let board = INITIAL_BOARD

	for (const event of events) {
		if (event.name === 'moved') {
			board = replaceAt(
				normalizeBoard(board),
				(event.data as EventDataMoved).position,
				(event.data as EventDataMoved).player
			)
		}

		if (event.name === 'started-new-game') {
			board = INITIAL_BOARD
		}

		if (event.name === 'board-set') {
			board = (event.data as EventDataSet).board
		}
	}
	return board
}

let events: EsEvent[] = []
let newEvents: EsEvent[]

let input = ''

let resultText = ''

// eslint-disable-next-line no-constant-condition
MAINLOOP: while (true) {
	process.stdout.write('\u001b[2J\u001b[0;0H') // Clear terminal and move cursor to 0,0

	log('events: %O', events)
	const boardDetails = getDetails(boardFromEvents(events))
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
				boardDetails.board[
					parseInt(boardDetails.winningRows[0][0])
				].toUpperCase()
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

import debugFactory from 'debug'
const log = debugFactory('log')

// An array of 3 positions 1-9
type Row = number[]

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

// A Board is a '#' followed by 9 characters in the set [XxOo_].
type Board = string

// The Board contains everything we need to know about the game state;
// other variables are derived for convenience.
type State = {
	board: Board
	counts: {
		x: number
		o: number
		_: number
	}
	turnNumber: number
	currentPlayer: string
	validMoves: number[]
	winningRowsX: Row[]
	winningRowsO: Row[]
}

const INITIAL_STATE = '___ ___ ___'

// 1. Strip insignificant characters.
// 2. Lower case.
// 3. Prepend # so positions match array indices.
function normalizeBoard(board: Board) {
	return '#' + board.replace(/[^xXoO_]/g, '').toLowerCase()
}

// For output in nice standard format.
function prettyBoard(board: Board) {
	return normalizeBoard(board).slice(1).replace(/.../g, '$& ').slice(0, -1)
}

// Derive useful info about game state from simple string representation of board.
function makeState(boardOrState: string | State) {
	if (typeof boardOrState !== 'string') {
		return boardOrState as State
	}

	const board = normalizeBoard(boardOrState)

	const counts = {
		x: (board.match(/x/g) || []).length,
		o: (board.match(/o/g) || []).length,
		_: (board.match(/_/g) || []).length,
	}

	const turnNumber = 10 - counts._

	const currentPlayer = turnNumber % 2 ? 'x' : 'o'

	const validMoves = ([...board.matchAll(/_/g)] || []).map(
		(match) => match.index as number
	)

	function makeWinningRowsFilter(player: string) {
		return (row: Row) =>
			board[row[0]] === player &&
			board[row[0]] === board[row[1]] &&
			board[row[0]] === board[row[2]]
	}
	const winningRowsX = ROWS.filter(makeWinningRowsFilter('x'))
	const winningRowsO = ROWS.filter(makeWinningRowsFilter('o'))

	return {
		board: prettyBoard(board),
		counts,
		turnNumber,
		currentPlayer,
		validMoves,
		winningRowsX,
		winningRowsO,
	}
}

const state = makeState('x_x o_O x_x')

log('state: %O', makeState(state))

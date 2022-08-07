const { groupBy } = require("lodash")
const { createObjectCsvWriter } = require("csv-writer")
const teams = require("./teams.json")
const { offense, defense, kickers, csvOptions } = require("../config.json")

const onCompletion = async (promise, text) => {
	const res = await promise
	console.log(`${text} data retrieved!`)
	return res
}

const findDefense = (entry) => {
	for (const team of teams) {
		if (team.name[0] !== entry[0].toUpperCase()) continue

		for (const a of team.aliases) {
			if (a === entry) return team
		}
	}

	return false
}

const roundNum = (num) => {
	if (typeof num === "string" && num.replace(/\D/g, "") === "") return 0

	num = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num

	return Math.round(num * 1000) / 1000
}

const findAverage = (arr) => {
	let sum = 0

	for (const n of arr) {
		sum += roundNum(n)
	}

	return sum / arr.length
}

//return array of players with data combined from all sources (objs)
const groupData = ([...sources]) => {
	const rawPlayers = []

	for (const s of sources) {
		rawPlayers.push(...s)
	}

	const groupedPlayers = groupBy(rawPlayers, (p) =>
		p.name
			.replace("III", "")
			.replace("II", "")
			.replace("Jr.", "")
			.replace("Sr.", "")
			.replace(/[^a-zA-Z0-9 ]/g, "")
			.toLowerCase()
			.trim()
	)

	const players = []

	for (const p of Object.keys(groupedPlayers)) {
		const player = { srcs: groupedPlayers[p].length, name: p }
		const pArr = groupedPlayers[p]

		for (const entry of pArr) {
			for (const prop of Object.keys(entry)) {
				if ((prop === "srcs" || prop === "name" || prop === "team" || prop === "pos") && player[prop]) continue

				if (player[prop]) player[prop].push(entry[prop])
				else {
					if (prop === "team" || prop === "pos") player[prop] = entry[prop]
					else player[prop] = [entry[prop]]
				}
			}
		}

		players.push(player)
	}

	return players
}

//return { pos, name, team, projPts }
const calculateProjections = (groupedData) => {
	const players = []

	for (const p of groupedData) {
		const player = {}

		for (const prop of Object.keys(p)) {
			if (Array.isArray(p[prop])) {
				player[prop] = findAverage(p[prop])
			} else {
				if (player[prop]) continue
				player[prop] = p[prop]
			}
		}

		players.push(player)
	}

	//calculate projections
	const { passingYards, passingTDs, ints, rushingYards, rushingTDs, receptions, receivingYards, receivingTDs } = offense
	const { sacks, ints: int, fumblesRec, TDs, safeties, pointsAllowedUpTo } = defense
	const { patMade, fieldGoalYards } = kickers

	const avgFieldGoalLengthAttempt = 36.3

	const scoring = {
		p_ydsScoring: passingYards,
		p_tdsScoring: passingTDs,
		intsScoring: ints,
		r_ydsScoring: rushingYards,
		r_tdsScoring: rushingTDs,
		recsScoring: receptions,
		rec_ydsScoring: receivingYards,
		rec_tdsScoring: receivingTDs,
		sackScoring: sacks,
		intScoring: int,
		fum_recScoring: fumblesRec,
		tdScoring: TDs,
		safScoring: safeties,
		xpmScoring: patMade,
	}

	for (const p of players) {
		let proj = 0

		for (const prop of Object.keys(p)) {
			if (prop === "srcs" || prop === "name" || prop === "pos" || prop === "team") continue
			if (prop === "pa") {
				const paScoreProps = Object.keys(pointsAllowedUpTo)
				const paPerWeekAvg = p[prop] / 16
				let paPerWeekAvgScore

				for (let i = 0; i < paScoreProps.length; i++) {
					if (paScoreProps[i] === "else") paPerWeekAvgScore = pointsAllowedUpTo["else"]
					if (paPerWeekAvg <= parseInt(paScoreProps[i])) {
						if (i === 0) paPerWeekAvgScore = pointsAllowedUpTo[paScoreProps[i]]
						else {
							const previousProp = paScoreProps[i - 1]
							const currentProp = paScoreProps[i]
							const previousPa = pointsAllowedUpTo[previousProp]
							const currentPa = pointsAllowedUpTo[currentProp]

							const diffInPaPts = Math.abs(currentPa - previousPa)

							paPerWeekAvgScore = previousPa - diffInPaPts * (paPerWeekAvg / currentPa)

							// 12 - ((12 - 9) * (5 / 6))
						}
					}
				}

				proj += paPerWeekAvgScore * 16
			} else if (prop === "fgm") proj += p[prop] * (avgFieldGoalLengthAttempt * fieldGoalYards)
			else proj += p[prop] * scoring[`${prop}Scoring`]
		}

		p["proj"] = proj
	}

	return players
}

const createCSV = async (projections = []) => {
	const { QBs, RBs, WRs, TEs, Ks, DEFs } = csvOptions
	let qbs = projections.filter((p) => p.pos === "QB").sort((a, b) => b.proj - a.proj)
	let rbs = projections.filter((p) => p.pos === "RB").sort((a, b) => b.proj - a.proj)
	let wrs = projections.filter((p) => p.pos === "WR").sort((a, b) => b.proj - a.proj)
	let tes = projections.filter((p) => p.pos === "TE").sort((a, b) => b.proj - a.proj)
	let ks = projections.filter((p) => p.pos === "K").sort((a, b) => b.proj - a.proj)
	let ds = projections.filter((p) => p.pos === "D").sort((a, b) => b.proj - a.proj)

	qbs = qbs.slice(0, Math.min(qbs.length, QBs)).map((p, i) => ({ posRank: i, ...p }))
	rbs = rbs.slice(0, Math.min(rbs.length, RBs)).map((p, i) => ({ posRank: i, ...p }))
	wrs = wrs.slice(0, Math.min(wrs.length, WRs)).map((p, i) => ({ posRank: i, ...p }))
	tes = tes.slice(0, Math.min(tes.length, TEs)).map((p, i) => ({ posRank: i, ...p }))
	ks = ks.slice(0, Math.min(ks.length, Ks)).map((p, i) => ({ posRank: i, ...p }))
	ds = ds.slice(0, Math.min(ds.length, DEFs)).map((p, i) => ({ posRank: i, ...p }))

	const players = [...qbs, ...rbs, ...wrs, ...tes, ...ks, ...ds]

	const headers = ["proj", "p_yds", "p_tds", "ints", "r_yds", "r_tds", "recs", "rec_yds", "rec_tds", "sack", "int", "fum_rec", "td", "saf", "pa", "fgm", "xpm"]

	const entries = players.map((p) => {
		const player = { srcs: p.srcs, name: p.name, pos: p.pos, team: p.team }
		for (const prop of headers) {
			if (p.hasOwnProperty(prop)) player[prop] = p[prop].toFixed(2)
			else player[prop] = "0"
		}

		return player
	})

	const csvWriter = createObjectCsvWriter({
		path: "projections.csv",
		header: ["srcs", "name", "pos", "team", ...headers].map((h) => ({ id: h, title: h.toUpperCase() })),
	})

	await csvWriter.writeRecords(entries)

	console.log("CSV written! Check projections.csv")
}

module.exports = { findDefense, groupData, roundNum, calculateProjections, createCSV, findAverage, onCompletion }
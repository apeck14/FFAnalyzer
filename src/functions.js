const { groupBy } = require("lodash")
const { createObjectCsvWriter } = require("csv-writer")
const teams = require("./teams.json")
const { offense, defense, kickers, csvOptions } = require("../config.json")

const formatName = (str) => {
	let newStr = str.toLowerCase()

	if (newStr.lastIndexOf(" jr") === newStr.length - 3 || newStr.lastIndexOf(" sr") === newStr.length - 3) newStr = newStr.slice(0, -3)

	return newStr
		.replace(" iii", "")
		.replace(" ii", "")
		.replace(" jr.", "")
		.replace(" sr.", "")
		.replace(/[^a-z0-9 ]/g, "")
		.replace("mitch ", "mitchell ")
		.trim()
}

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
const groupData = ([...sources], injuryRisks) => {
	const rawPlayers = []

	for (const s of sources) {
		rawPlayers.push(
			...s.map((p) => ({
				...p,
				name: formatName(p.name),
			}))
		)
	}

	const groupedPlayers = groupBy(rawPlayers, "name")

	const players = []

	for (const p of Object.keys(groupedPlayers)) {
		const pArr = groupedPlayers[p]
		const player = { srcs: groupedPlayers[p].length, name: p }

		const injuryRiskObj = injuryRisks.find((pl) => pl.name === p)
		const injuryRisk = injuryRiskObj?.risk || (pArr[0].pos === "D" ? "-" : "Very Low")

		player.injury_risk = injuryRisk

		for (const entry of pArr) {
			for (const prop of Object.keys(entry)) {
				if ((prop === "srcs" || prop === "injury_risk" || prop === "name" || prop === "team" || prop === "pos") && player[prop]) continue

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
	const { passingYards, passingTDs, ints, rushingYards, rushingTDs, receptions, receivingYards, receivingTDs, bonusPoints } = offense
	const { points, passingYards: p_ydsBonus, rushingYards: r_ydsBonus, receivingYards: rec_ydsBonus } = bonusPoints
	const { sacks, ints: int, fumblesRec, TDs, safeties, pointsAllowedUpTo } = defense
	const { patMade, fieldGoalYards, distanceUpTo } = kickers

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
			if (prop === "srcs" || prop === "injury_risk" || prop === "name" || prop === "pos" || prop === "team") continue
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
						}
					}
				}

				proj += paPerWeekAvgScore * 16
			} else if (prop === "fgm") {
				proj += p[prop] * (avgFieldGoalLengthAttempt * fieldGoalYards) //field goal yards
				proj += p[prop] * distanceUpTo["39"] //field goals by avg distance
			} else proj += p[prop] * scoring[`${prop}Scoring`]

			//offense yards bonus points
			if (prop === "p_yds" || prop === "r_yds" || prop === "rec_yds") {
				const avgYardsPerGame = p[prop] / 16

				if (prop === "p_yds" && p_ydsBonus > 0) proj += (avgYardsPerGame / p_ydsBonus) * points * 16
				if (prop === "r_yds" && r_ydsBonus > 0) proj += (avgYardsPerGame / r_ydsBonus) * points * 16
				if (prop === "rec_yds" && rec_ydsBonus > 0) proj += (avgYardsPerGame / rec_ydsBonus) * points * 16
			}
		}

		p["proj"] = proj
	}

	return players.sort((a, b) => b.proj - a.proj)
}

const createCSV = async (projections = []) => {
	const { QBs, RBs, WRs, TEs, Ks, DEFs } = csvOptions
	let qbs = projections.filter((p) => p.pos === "QB")
	let rbs = projections.filter((p) => p.pos === "RB")
	let wrs = projections.filter((p) => p.pos === "WR")
	let tes = projections.filter((p) => p.pos === "TE")
	let ks = projections.filter((p) => p.pos === "K")
	let ds = projections.filter((p) => p.pos === "D")

	qbs = qbs.slice(0, Math.min(qbs.length, QBs)).map((p, i) => ({ posRank: i + 1, ...p }))
	rbs = rbs.slice(0, Math.min(rbs.length, RBs)).map((p, i) => ({ posRank: i + 1, ...p }))
	wrs = wrs.slice(0, Math.min(wrs.length, WRs)).map((p, i) => ({ posRank: i + 1, ...p }))
	tes = tes.slice(0, Math.min(tes.length, TEs)).map((p, i) => ({ posRank: i + 1, ...p }))
	ks = ks.slice(0, Math.min(ks.length, Ks)).map((p, i) => ({ posRank: i + 1, ...p }))
	ds = ds.slice(0, Math.min(ds.length, DEFs)).map((p, i) => ({ posRank: i + 1, ...p }))

	const players = [...qbs, ...rbs, ...wrs, ...tes, ...ks, ...ds]

	const headers = ["proj", "p_yds", "p_tds", "ints", "r_yds", "r_tds", "recs", "rec_yds", "rec_tds", "sack", "int", "fum_rec", "td", "saf", "pa", "fgm", "xpm"]

	const entries = players.map((p) => {
		const player = { posRank: p.posRank, srcs: p.srcs, injury_risk: p.injury_risk, name: p.name, pos: p.pos, team: p.team }
		for (const prop of headers) {
			if (p.hasOwnProperty(prop)) player[prop] = p[prop].toFixed(2)
			else player[prop] = "0"
		}

		return player
	})

	const csvWriter = createObjectCsvWriter({
		path: "projections.csv",
		header: ["posRank", "srcs", "injury_risk", "name", "pos", "team", ...headers].map((h) => ({ id: h, title: h.toUpperCase() })),
	})

	await csvWriter.writeRecords(entries)

	console.log("CSV written! Check projections.csv")
}

const injuryPredictions = (currentIRRisks = [], allRisks = []) => {
	allRisks = allRisks.map((p) => ({ name: formatName(p.name), risk: p.risk }))

	const risks = [...currentIRRisks.map((p) => ({ name: formatName(p.name), risk: p.risk }))]

	for (const p of allRisks) {
		if (risks.find((pl) => pl.name === p.name)) continue

		risks.push(p)
	}

	return risks
}

module.exports = { findDefense, groupData, roundNum, calculateProjections, createCSV, findAverage, onCompletion, injuryPredictions, formatName }

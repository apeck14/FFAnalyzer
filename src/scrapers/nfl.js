//https://fantasy.nfl.com/research/projections#researchProjections=researchProjections%2C%2Fresearch%2Fprojections%253Fposition%253D1%2526statCategory%253DprojectedStats%2526statSeason%253D2022%2526statType%253DseasonProjectedStats%2526statWeek%253D1%2Creplace
const { findDefense } = require("../functions")

module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		await page.goto(
			"https://fantasy.nfl.com/research/projections#researchProjections=researchProjections%2C%2Fresearch%2Fprojections%253Fposition%253D1%2526statCategory%253DprojectedStats%2526statSeason%253D2022%2526statType%253DseasonProjectedStats%2526statWeek%253D1%2Creplace",
			{ waitUntil: "networkidle2" }
		)

		await page.waitForSelector("#pos1 > a")

		const positionButtonSelectors = {
			qb: "#pos1 > a",
			rb: "#pos2 > a",
			wr: "#pos3 > a",
			te: "#pos4 > a",
			k: "#pos7 > a",
			d: "#pos8 > a",
		}

		await page.click("#st2022 > a")
		await page.waitForTimeout(1500)

		const players = []

		//grab data
		for (const pos of positions) {
			await page.click(positionButtonSelectors[pos])
			await page.waitForTimeout(500)

			for (let i = 0; i < 2; i++) {
				const positionPlayers = (
					await page.$eval("#researchProjections > div > div.bd > div > table", (table) => {
						const allPlayers = []

						const rows = table.querySelectorAll("#researchProjections > div > div.bd > div > table > tbody > tr")

						rows.forEach((row) => {
							const posAndTeam = row.querySelector("td.playerNameAndInfo.first > div > em")
							const position =
								posAndTeam.innerText.length === 3 ? posAndTeam.innerText : posAndTeam.innerText.slice(0, posAndTeam.innerText.indexOf(" ") || undefined)

							let headers = []

							if (position === "K") headers = ["name", "opp", "gp", "xpm", "fg019", "fg2029", "fg3039", "fg4049", "fg50", "fp"]
							else if (position === "DEF") headers = ["name", "opp", "gp", "sack", "int", "fum_rec", "saf", "def_tds", "def2ptret", "ret_tds", "pa", "fp"]
							else
								headers = [
									"name",
									"opp",
									"gp",
									"p_yds",
									"p_tds",
									"ints",
									"r_yds",
									"r_tds",
									"recs",
									"rec_yds",
									"rec_tds",
									"ret_tds",
									"fum_tds",
									"2pt",
									"fum_lost",
									"fp",
								]

							const columns = row.querySelectorAll("td")

							const player = {}

							columns.forEach((col, i) => {
								player[headers[i]] = col.innerText
							})

							allPlayers.push(player)
						})

						return allPlayers
					})
				).map((p) => ({ pos: pos.toUpperCase(), ...p }))

				players.push(...positionPlayers)

				if (i === 0) {
					await page.click(".next")
					await page.waitForTimeout(500)
				}
			}
		}

		//clean up data
		const cleanedPlayers = players.map((p) => {
			let {
				pos,
				name,
				team,
				p_yds,
				p_tds,
				ints,
				r_yds,
				r_tds,
				recs,
				rec_yds,
				rec_tds,
				fg019,
				fg2029,
				fg3039,
				fg4049,
				fg50,
				xpm,
				fum_rec,
				int,
				ret_tds,
				def_tds,
				sack,
				pa,
				saf,
			} = p

			if (pos === "D") {
				const teamData = findDefense(name.slice(0, name.indexOf("\nDEF")))

				name = teamData.name
				team = teamData.abbr
			} else {
				team = name.slice(name.indexOf("\n") + 2)
				team = team.slice(team.indexOf(" ") + 3)
				if (team.indexOf("\n") >= 0) team = team.slice(0, team.indexOf("\n"))

				name = name.slice(0, name.indexOf("\n"))
			}

			if (pos === "QB")
				return {
					name,
					pos,
					team,
					p_yds,
					p_tds,
					ints,
					r_yds,
					r_tds,
				}
			else if (pos === "RB")
				return {
					name,
					pos,
					team,
					r_yds,
					r_tds,
					recs,
					rec_yds,
					rec_tds,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name,
					pos,
					team,
					recs,
					rec_yds,
					rec_tds,
				}
			else if (pos === "K")
				return {
					name,
					pos,
					team,
					fgm: (parseFloat(fg019) || 0) + (parseFloat(fg2029) || 0) + (parseFloat(fg3039) || 0) + (parseFloat(fg4049) || 0) + (parseFloat(fg50) || 0),
					xpm: xpm || 0,
				}
			else if (pos === "D") {
				return {
					name,
					pos,
					team,
					pa,
					fum_rec,
					int,
					td: parseFloat(def_tds) + parseFloat(ret_tds),
					sack,
					saf,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("ESPN Error")
		console.log(e)
		return []
	}
}

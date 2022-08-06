const teams = require("../teams.json")

module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)
		await page.setDefaultTimeout(7000)

		const players = []

		//grab data
		for (const pos of positions) {
			let posStr = pos

			if (pos === "k") posStr = "pk"
			else if (pos === "d") posStr = "teamdefense"

			const url = `https://football.razzball.com/projections-${posStr}-restofseason`
			await page.goto(url)

			await page.waitForTimeout(2000)

			const positionPlayers = (
				await page.$eval("#neorazzstatstable", (table) => {
					const ths = table.querySelectorAll("thead > tr > th")

					const headers = []

					ths.forEach((th) => {
						const div = th.querySelector("div")
						headers.push(div.innerText.replace(/\s/g, ""))
					})

					const allPlayers = []
					const rows = table.querySelectorAll("tbody > tr")

					rows.forEach((row) => {
						const columns = row.querySelectorAll("td")

						const player = {}

						columns.forEach((col, index) => {
							player[headers[index]] = col.innerText.trim()
						})

						allPlayers.push(player)
					})

					return allPlayers
				})
			).map((p) => ({ pos: pos.toUpperCase(), ...p }))

			players.push(...positionPlayers)
		}

		//clean up data
		const cleanedPlayers = players.map((p) => {
			const { Name, pos, Team, PassYds, PassTD, Int, RushYds, RunTD, Rec, RecYds, RecTD, FG, XP, Points, Fum, TD, Sck, Saf } = p

			if (pos === "QB")
				return {
					name: Name,
					pos,
					team: Team,
					p_yds: PassYds,
					p_tds: PassTD,
					ints: Int,
					r_yds: RushYds,
					r_tds: RunTD,
				}
			else if (pos === "RB")
				return {
					name: Name,
					pos,
					team: Team,
					r_yds: RushYds,
					r_tds: RunTD,
					recs: Rec,
					rec_yds: RecYds,
					rec_tds: RecTD,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name: Name,
					pos,
					team: Team,
					recs: Rec,
					rec_yds: RecYds,
					rec_tds: RecTD,
				}
			else if (pos === "K")
				return {
					name: Name,
					pos,
					team: Team,
					fgm: FG,
					xpm: XP,
				}
			else if (pos === "D") {
				const teamData = teams.find((t) => t.abbr === Team)

				return {
					name: teamData.name,
					pos,
					team: Team,
					pa: Points,
					fum_rec: Fum,
					int: Int,
					td: TD,
					sack: Sck,
					saf: Saf,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("RazzBall Error")
		console.log(e)
		return []
	}
}

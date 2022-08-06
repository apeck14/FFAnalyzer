const { findDefense } = require("../functions")

module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		const players = []

		//grab data
		for (const pos of positions) {
			const url = `https://www.numberfire.com/nfl/fantasy/fantasy-football-cheat-sheet/${pos.toLowerCase()}`
			await page.goto(url)

			await page.waitForSelector(".draftable-player-row")

			const positionPlayers = await page.$$eval(".draftable-player-row", (rows) => {
				return Array.from(rows, (row) => {
					const columns = row.querySelectorAll("td")
					const player = {}

					for (const col of columns) {
						player[col.className] = col.innerText
					}

					return player
				})
			})

			players.push(...positionPlayers)

			await page.waitForTimeout(1000)
		}

		//clean up data
		const cleanedPlayers = players.map((p) => {
			const playerInfo = p["left-aligned player-draft "] || p["left-aligned player-draft injured"]
			const data = playerInfo.split("\n")

			const name = data[1]
			const team = data[2].slice(0, data[2].indexOf(","))
			const pos = data[2].slice(data[2].indexOf(",") + 2)

			const player = { name, pos, team }
			const { p_yds, p_tds, ints, r_yds, r_tds, rec_att: recs, rec_yds, rec_tds, fgm, xpm, pa, fum_rec, int, td, sack, saf } = p

			if (pos === "QB") return { ...player, p_yds, p_tds, ints, r_yds, r_tds }
			else if (pos === "RB") return { ...player, r_yds, r_tds, recs, rec_yds, rec_tds }
			else if (pos === "WR" || pos === "TE") return { ...player, recs, rec_yds, rec_tds }
			else if (pos === "K") return { ...player, fgm, xpm }
			else if (pos === "D") {
				const { name: defName } = findDefense(name)
				return { name: defName, pos, team, pa, fum_rec, int, td, sack, saf }
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("numberfire Error")
		console.log(e)
		return []
	}
}

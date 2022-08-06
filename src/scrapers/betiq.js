module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		const players = []

		//grab data
		for (const pos of positions) {
			let posStr = pos

			if (pos === "k") posStr = "kicker"
			else if (pos === "d") posStr = "defense"

			const url = `https://betiq.teamrankings.com/fantasy-football/projections/standard/${posStr}/`
			await page.goto(url)

			await page.waitForSelector("#fantasy-table")

			const positionPlayers = (
				await page.$eval("#fantasy-table", (table) => {
					const mainThs = table.querySelectorAll("tr.super-header-row > th")
					const subThs = table.querySelectorAll("thead > tr:nth-child(2) > th")

					const mainHeaders = []

					mainThs.forEach((th) => {
						const title = th.innerText.includes("PROJECTIONS LAST UPDATED") ? "" : th.innerText
						mainHeaders.push({ title, colspan: parseInt(th.getAttribute("colspan")) || 1 })
					})

					const headers = []

					subThs.forEach((th, i) => {
						let maxIndex = 0

						for (let x = 0; x < mainHeaders.length; x++) {
							maxIndex += mainHeaders[x].colspan

							if (i < maxIndex) return headers.push(`${mainHeaders[x].title}${th.innerText}`.trim())
						}
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
			const {
				pos,
				PLAYER,
				TEAM,
				PASSINGYDS,
				PASSINGTD,
				PASSINGINT,
				RUSHINGYDS,
				RUSHINGTD,
				RECEIVINGREC,
				RECEIVINGYDS,
				RECEIVINGTD,
				KICKINGFGM,
				KICKINGXPM,
				DEFENSEPTSA,
				DEFENSEFR,
				DEFENSEINT,
				DEFENSETD,
				DEFENSESCK,
			} = p

			const player = { name: PLAYER, pos, team: TEAM }

			if (pos === "QB")
				return {
					...player,
					p_yds: PASSINGYDS,
					p_tds: PASSINGTD,
					ints: PASSINGINT,
					r_yds: RUSHINGYDS,
					r_tds: RUSHINGTD,
				}
			else if (pos === "RB")
				return {
					...player,
					r_yds: RUSHINGYDS,
					r_tds: RUSHINGTD,
					recs: RECEIVINGREC,
					rec_yds: RECEIVINGYDS,
					rec_tds: RECEIVINGTD,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					...player,
					recs: RECEIVINGREC,
					rec_yds: RECEIVINGYDS,
					rec_tds: RECEIVINGTD,
				}
			else if (pos === "K")
				return {
					...player,
					fgm: KICKINGFGM,
					xpm: KICKINGXPM,
				}
			else if (pos === "D") {
				return {
					...player,
					pa: DEFENSEPTSA,
					fum_rec: DEFENSEFR,
					int: DEFENSEINT,
					td: DEFENSETD,
					sack: DEFENSESCK,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("BETIQ Error")
		console.log(e)
		return []
	}
}

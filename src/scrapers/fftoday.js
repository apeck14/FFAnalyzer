const { findDefense } = require("../functions")

module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		const players = []

		const posIDs = { qb: 10, rb: 20, wr: 30, te: 40, k: 80, d: 99 }

		//grab data
		for (const pos of positions) {
			const url = `https://www.fftoday.com/rankings/playerproj.php?PosID=${posIDs[pos.toLowerCase()]}&LeagueID=1`
			await page.goto(url)

			await page.waitForSelector("td.bodycontent > table:nth-child(11) > tbody > tr > td > table > tbody")

			const positionPlayers = (
				await page.$eval("td.bodycontent > table:nth-child(11) > tbody > tr > td > table > tbody", (tbody) => {
					const mainTds = tbody.querySelectorAll("tr.tablehdr > td")
					const subTds = tbody.querySelectorAll("tr.tableclmhdr > td")

					const mainHeaders = []

					mainTds.forEach((td) => {
						mainHeaders.push({ title: td.innerText, colspan: parseInt(td.getAttribute("colspan")) || 1 })
					})

					const headers = []

					subTds.forEach((td, i) => {
						const b = td.querySelector("b")
						let maxIndex = 0

						for (let x = 0; x < mainHeaders.length; x++) {
							maxIndex += mainHeaders[x].colspan

							if (i < maxIndex) return headers.push(`${mainHeaders[x].title}${b.innerText}`.trim())
						}
					})

					const allPlayers = []

					const rows = tbody.querySelectorAll("tr")

					rows.forEach((row, i) => {
						if (i < 2) return

						const columns = row.querySelectorAll("td.smallbody")

						const player = {}

						columns.forEach((col, index) => {
							const aTag = col.querySelector("a")
							const val = index === 1 ? aTag.innerText : col.innerText

							player[headers[index]] = val.trim()
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
				Player,
				Team,
				PassingYard,
				PassingTD,
				PassingINT,
				RushingYard,
				RushingTD,
				ReceivingRec,
				ReceivingYard,
				ReceivingTD,
				FGM,
				EPM,
				PA,
				FR,
				INT,
				DefTD,
				KickTD,
				Sack,
				S,
			} = p

			if (pos === "QB")
				return {
					name: Player,
					pos,
					team: Team,
					p_yds: PassingYard,
					p_tds: PassingTD,
					ints: PassingINT,
					r_yds: RushingYard,
					r_tds: RushingTD,
				}
			else if (pos === "RB")
				return {
					name: Player,
					pos,
					team: Team,
					r_yds: RushingYard,
					r_tds: RushingTD,
					recs: ReceivingRec,
					rec_yds: ReceivingYard,
					rec_tds: ReceivingTD,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name: Player,
					pos,
					team: Team,
					recs: ReceivingRec,
					rec_yds: ReceivingYard,
					rec_tds: ReceivingTD,
				}
			else if (pos === "K")
				return {
					name: Player,
					pos,
					team: Team,
					fgm: FGM,
					xpm: EPM,
				}
			else if (pos === "D") {
				const { abbr } = findDefense(Team)

				return {
					name: Team,
					pos,
					team: abbr,
					pa: PA,
					fum_rec: FR,
					int: INT,
					td: parseFloat(DefTD) + parseFloat(KickTD),
					sack: Sack,
					saf: S,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("FFToday Error")
		console.log(e)
		return []
	}
}

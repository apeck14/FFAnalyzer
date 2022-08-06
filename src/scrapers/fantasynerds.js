module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		await page.goto("https://www.fantasynerds.com/signin")

		await page.waitForSelector("#signin > div:nth-child(5) > button")

		await page.type("#email", "aaronpeck_14@yahoo.com")
		await page.type("#password", "TESTPASSWORD1")
		await page.click("#signin > div:nth-child(5) > button")

		await page.waitForNavigation()

		//TESTPASSWORD1

		await page.goto("https://www.fantasynerds.com/nfl/draft-projections", { waitUntil: "networkidle2" })

		await page.waitForSelector("#fnCanvas > div.row > div > a:nth-child(1)")

		const positionButtonSelectors = {
			qb: "#fnCanvas > div.row > div > a:nth-child(1)",
			rb: "#fnCanvas > div.row > div > a:nth-child(2)",
			wr: "#fnCanvas > div.row > div > a:nth-child(3)",
			te: "#fnCanvas > div.row > div > a:nth-child(4)",
			k: "#fnCanvas > div.row > div > a:nth-child(5)",
			d: "#fnCanvas > div.row > div > a:nth-child(6)",
		}

		const nextBtnSelector = "#projections_next > a"

		const players = []

		//grab data
		for (const pos of positions) {
			await page.click(positionButtonSelectors[pos])
			await page.waitForTimeout(1000)

			const paginations = pos === "rb" || pos === "wr" ? 6 : 4

			for (let i = 0; i < paginations; i++) {
				const positionPlayers = (
					await page.$eval("#projections", (table) => {
						const ths = table.querySelectorAll("thead > tr > th")

						const headers = []

						ths.forEach((th) => {
							headers.push(th.innerText)
						})

						const allPlayers = []

						const rows = table.querySelectorAll("#results > tr")

						rows.forEach((row) => {
							const columns = row.querySelectorAll("td")

							const player = {}

							columns.forEach((col, i) => {
								const val = col.querySelector("a")?.innerText || col.innerText

								player[headers[i]] = val
							})

							allPlayers.push(player)
						})

						return allPlayers
					})
				).map((p) => ({ pos: pos.toUpperCase(), ...p }))

				players.push(...positionPlayers)

				//click next 4 times
				await page.click(nextBtnSelector)
				await page.waitForTimeout(500)
			}
		}

		//clean up data
		const cleanedPlayers = players.map((p) => {
			const { pos, PLAYER, TEAM, PassYd, PassTd, PassInt, RuYds, RuTD, Rec, RecYd, RecTD, FGM, XPM, Int, Sack, Safety } = p

			if (pos === "QB")
				return {
					name: PLAYER,
					pos,
					team: TEAM,
					p_yds: PassYd,
					p_tds: PassTd,
					ints: PassInt,
					r_yds: RuYds,
					r_tds: RuTD,
				}
			else if (pos === "RB")
				return {
					name: PLAYER,
					pos,
					team: TEAM,
					r_yds: RuYds,
					r_tds: RuTD,
					recs: Rec,
					rec_yds: RecYd,
					rec_tds: RecTD,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name: PLAYER,
					pos,
					team: TEAM,
					recs: Rec,
					rec_yds: RecYd,
					rec_tds: RecTD,
				}
			else if (pos === "K")
				return {
					name: PLAYER,
					pos,
					team: TEAM,
					fgm: FGM,
					xpm: XPM,
				}
			else if (pos === "D") {
				return {
					name: PLAYER,
					pos,
					team: TEAM,
					int: Int,
					sack: Sack,
					saf: Safety,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("FantasyNerds Error")
		console.log(e)
		return []
	}
}

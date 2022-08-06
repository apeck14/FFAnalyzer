const { findDefense } = require("../functions")

module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		const players = []

		//grab data
		for (const pos of positions) {
			let posStr = pos.toUpperCase()

			if (pos === "d") posStr = "DST"

			const url = `https://www.cbssports.com/fantasy/football/stats/${posStr}/2022/season/projections/ppr/`
			await page.goto(url)

			const nextTimeBtn = (await page.$("body > div.fEy1Z2XT > div > div._9r0K-Oum._5kE-6aUK > div > div._4e8HpQ5S > span.bB48ietO > button")) || ""

			if (nextTimeBtn) await page.click(nextTimeBtn)

			await page.waitForSelector("table.TableBase-table")

			const positionPlayers = (
				await page.$eval("table.TableBase-table", (table) => {
					const ths = table.querySelectorAll("th.TableBase-headTh")

					const headers = []

					ths.forEach((th) => {
						const aTag = th.querySelector("a")
						const href = aTag.getAttribute("href")

						const sliced = href.slice(0, href.lastIndexOf("&"))

						headers.push(sliced.slice(sliced.lastIndexOf("=") + 1))
					})

					const allPlayers = []

					const rows = table.querySelectorAll("#TableBase > div > div > table > tbody > tr")

					rows.forEach((row) => {
						const columns = row.querySelectorAll("td.TableBase-bodyTd")

						const player = {}

						columns.forEach((col, index) => {
							let val
							if (index === 0) {
								const team = col.querySelector("span.CellPlayerName--long > span > span.CellPlayerName-team")
								const divATag = col.querySelector("div.TeamLogoNameLockup-nameContainer > div > span > a")

								player.team = team?.innerText.trim() || ""

								if (divATag) val = divATag.innerText
								else {
									const aTag = col.querySelector("span.CellPlayerName--long > span > a")
									val = aTag.innerText
								}
							} else val = col.innerText

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
				player,
				team,
				passing_yds,
				passing_td,
				passing_int,
				rushing_yds,
				rushing_td,
				receiving_rec,
				receiving_yds,
				receiving_td,
				fg_fgm,
				xp_xpm,
				ppg,
				frec,
				int,
				dtd,
				sck,
				sfty,
			} = p

			if (pos === "QB")
				return {
					name: player,
					pos,
					team,
					p_yds: passing_yds,
					p_tds: passing_td,
					ints: passing_int,
					r_yds: rushing_yds,
					r_tds: rushing_td,
				}
			else if (pos === "RB")
				return {
					name: player,
					pos,
					team,
					r_yds: rushing_yds,
					r_tds: rushing_td,
					recs: receiving_rec,
					rec_yds: receiving_yds,
					rec_tds: receiving_td,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name: player,
					pos,
					team,
					recs: receiving_rec,
					rec_yds: receiving_yds,
					rec_tds: receiving_td,
				}
			else if (pos === "K")
				return {
					name: player,
					pos,
					team,
					fgm: fg_fgm,
					xpm: xp_xpm,
				}
			else if (pos === "D") {
				const def = findDefense(team)
				return {
					name: def.name,
					pos,
					team,
					pa: ppg,
					fum_rec: frec,
					int,
					td: dtd,
					sack: sck,
					saf: sfty,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("CBS Error")
		console.log(e)
		return []
	}
}

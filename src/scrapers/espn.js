const teams = require("../teams.json")

module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		await page.goto("https://fantasy.espn.com/football/players/projections?leagueFormatId=3", { waitUntil: "networkidle2" })

		await page.waitForSelector("#filterSlotIds > label:nth-child(2)")

		const positionButtonSelectors = {
			qb: "#filterSlotIds > label:nth-child(2)",
			rb: "#filterSlotIds > label:nth-child(3)",
			wr: "#filterSlotIds > label:nth-child(4)",
			te: "#filterSlotIds > label:nth-child(5)",
			k: "#filterSlotIds > label:nth-child(8)",
			d: "#filterSlotIds > label:nth-child(7)",
		}
		const players = []

		//grab data
		for (const pos of positions) {
			await page.click(positionButtonSelectors[pos])
			await page.waitForTimeout(1500)

			const positionPlayers = (
				await page.$eval("div.players-table__sortable", (div) => {
					const allPlayers = []

					const playerDivs = div.querySelectorAll("div.full-projection-table")

					playerDivs.forEach((d) => {
						const name = d.querySelector("div.player-name > span > a")?.innerText || ""
						const team = d.querySelector("span.player-teamname")?.innerText || name.slice(0, name.indexOf(" "))

						if (team === "FA") return

						const player = { name, team }

						const statProjs = d.querySelectorAll("tbody > tr:nth-child(2) > td > div.table--cell")

						statProjs.forEach((div, i) => {
							if (i === 0) return
							let header = div.title.replace(/ /g, "")

							if (header.includes("FieldGoalsMade")) header = header.slice(0, header.indexOf("/")) + header.replace(/\D/g, "")
							else if (header.includes("ExtraPointsMade")) header = "ExtraPointsMade"

							player[header] = div.innerText
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
				name,
				team,
				PassingYards,
				TDPass,
				InterceptionsThrown,
				RushingYards,
				TDRush,
				Eachreception,
				ReceivingYards,
				TDReception,
				FieldGoalsMade,
				ExtraPointsMade,
				EachFumbleRecovered,
				EachInterception,
				TotalReturnTD,
				EachSack,
				PointsAllowed,
			} = p

			const teamAbbr = teams.find((t) => t.name.includes(team)).abbr

			if (pos === "QB")
				return {
					name,
					pos,
					team: teamAbbr,
					p_yds: PassingYards,
					p_tds: TDPass,
					ints: InterceptionsThrown,
					r_yds: RushingYards,
					r_tds: TDRush,
				}
			else if (pos === "RB")
				return {
					name,
					pos,
					team: teamAbbr,
					r_yds: RushingYards,
					r_tds: TDRush,
					recs: Eachreception,
					rec_yds: ReceivingYards,
					rec_tds: TDReception,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name,
					pos,
					team: teamAbbr,
					recs: Eachreception,
					rec_yds: ReceivingYards,
					rec_tds: TDReception,
				}
			else if (pos === "K")
				return {
					name,
					pos,
					team: teamAbbr,
					fgm: FieldGoalsMade.slice(0, FieldGoalsMade.indexOf("/")),
					xpm: ExtraPointsMade.slice(0, ExtraPointsMade.indexOf("/")),
				}
			else if (pos === "D") {
				const { name: teamName } = teams.find((t) => t.name.includes(name.slice(0, name.indexOf(" "))))

				return {
					name: teamName,
					pos,
					team: teamAbbr,
					pa: PointsAllowed,
					fum_rec: EachFumbleRecovered,
					int: EachInterception,
					td: TotalReturnTD,
					sack: EachSack,
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

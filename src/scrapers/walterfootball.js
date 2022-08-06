module.exports = async (browser, positions = ["qb", "rb", "wr", "te", "k", "d"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)
		await page.setViewport({ width: 1366, height: 768 })

		await page.goto("https://walterfootball.com/fantasyrankings")
		await page.waitForSelector("#ds-iframe")

		const iFrameElement = await page.$("#ds-iframe")
		const frame = await iFrameElement.contentFrame()

		await frame.waitForSelector("#position-navbar > ul > li.qb.nav-link > a")

		const positionButtonSelectors = {
			qb: "#position-navbar > ul > li.qb.nav-link > a",
			rb: "#position-navbar > ul > li.rb.nav-link > a",
			wr: "#position-navbar > ul > li.wr.nav-link > a",
			te: "#position-navbar > ul > li.te.nav-link > a",
			k: "#position-navbar > ul > li.k.nav-link > a",
			d: "#position-navbar > ul > li.def.nav-link > a",
		}
		const players = []

		//grab data
		for (const pos of positions) {
			const posBtn = await frame.$(positionButtonSelectors[pos])

			await posBtn.click()

			await frame.waitForNavigation()

			const positionPlayers = (
				await frame.$eval("#w0 > table", (table) => {
					const allPlayers = []

					const rows = table.querySelectorAll("tbody > tr")

					rows.forEach((row) => {
						const columns = row.querySelectorAll("td")
						const teamImg = row.querySelector("img.team-logo")

						const player = { team: teamImg.src.slice(teamImg.src.lastIndexOf("/") + 1, teamImg.src.lastIndexOf(".")) }

						columns.forEach((col, index) => {
							const header = col.className.split(" ")[0] || "name"
							let val
							if (index === 0) {
								const span = col.querySelector("span.player-name-position")
								val = span.innerText
							} else val = col.innerText

							player[header.replace(/-/g, "")] = val.trim()
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
				passyds,
				passtd,
				int,
				rushyds,
				rushtds,
				rec,
				recyds,
				rectds,
				fgs30,
				fgs3039,
				fgs4049,
				fgs50,
				xps,
				fumrec,
				ints,
				defensivetds,
				specialteamstds,
				sacks,
			} = p

			if (pos === "QB")
				return {
					name,
					pos,
					team,
					p_yds: passyds,
					p_tds: passtd,
					ints: int,
					r_yds: rushyds,
					r_tds: rushtds,
				}
			else if (pos === "RB")
				return {
					name,
					pos,
					team,
					r_yds: rushyds,
					r_tds: rushtds,
					recs: rec,
					rec_yds: recyds,
					rec_tds: rectds,
				}
			else if (pos === "WR" || pos === "TE")
				return {
					name,
					pos,
					team,
					recs: rec,
					rec_yds: recyds,
					rec_tds: rectds,
				}
			else if (pos === "K")
				return {
					name,
					pos,
					team,
					fgm: parseFloat(fgs30) + parseFloat(fgs3039) + parseFloat(fgs4049) + parseFloat(fgs50),
					xpm: xps,
				}
			else if (pos === "D") {
				return {
					name,
					pos,
					team,
					fum_rec: fumrec,
					int: ints,
					td: (parseFloat(defensivetds) + parseFloat(specialteamstds)).toFixed(1),
					sack: sacks,
				}
			}
		})

		return cleanedPlayers
	} catch (e) {
		console.log("Walter Football Error")
		console.log(e)
		return []
	}
}

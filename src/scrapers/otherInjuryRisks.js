module.exports = async (browser, positions = ["qb", "rb", "wr", "te"]) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		await page.goto("https://www.draftsharks.com/injury-predictor")

		await page.waitForSelector("#position-navbar > ul > li.qb")

		const positionButtonSelectors = {
			qb: "#position-navbar > ul > li.qb",
			rb: "#position-navbar > ul > li.rb",
			wr: "#position-navbar > ul > li.wr",
			te: "#position-navbar > ul > li.te",
		}

		const players = []

		//grab data
		for (const pos of positions) {
			await page.click(positionButtonSelectors[pos])
			await page.waitForSelector("div.table-sip-info > table > tbody")

			const positionPlayers = await page.$eval("div.table-sip-info > table > tbody", (tbody) => {
				const allPlayers = []

				const rows = tbody.querySelectorAll("tr")

				rows.forEach((r) => {
					let name = r.querySelector("td > span.player-name")?.innerText

					if (!name) return

					name = name.slice(0, name.indexOf(","))

					const perc = r.querySelector("td > span.injury-percent").innerText
					const percInt = parseInt(perc.slice(0, perc.indexOf("%")).trim())
					const risk = percInt >= 50 ? "High" : percInt >= 25 ? "Moderate" : percInt >= 15 ? "Low" : "Very Low"

					allPlayers.push({
						name,
						risk,
					})
				})

				return allPlayers
			})

			players.push(...positionPlayers)
		}

		return players
	} catch (e) {
		console.log("Draft Sharks Injury Predictor Error")
		console.log(e)
		return []
	}
}

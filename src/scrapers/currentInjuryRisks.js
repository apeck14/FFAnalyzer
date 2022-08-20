module.exports = async (browser) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		const url = `https://www.pff.com/news/fantasy-football-injury-preview-2022-michael-gallup-christian-mccaffrey-jimmy-garoppolo-odell-beckham-jr`
		await page.goto(url)

		await page.waitForSelector(".m-longform-copy")

		const players = await page.$eval(".m-longform-copy", (div) => {
			const names = div.querySelectorAll("h3")
			const injuries = div.querySelectorAll("h5 > strong, h5 > b")

			const injuryRisks = []

			injuries.forEach((h5) => {
				if (h5.innerText.includes("risk")) injuryRisks.push(h5.innerText)
			})

			const allPlayers = []

			names.forEach((h3, i) => {
				const a = h3.querySelector("a[href*='players'], strong > a[href*='players'], b > a[href*='players']")

				const risk = injuryRisks[i].replace("Injury risk:", "").trim()
				allPlayers.push({
					name: a.innerText,
					risk,
				})
			})

			return allPlayers
		})

		return players
	} catch (e) {
		console.log("Injury Risk Error")
		console.log(e)
		return []
	}
}

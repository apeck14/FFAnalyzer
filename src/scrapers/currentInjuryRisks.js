module.exports = async (browser) => {
	try {
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(15000)

		const url = `https://www.pff.com/news/fantasy-football-injury-preview-2022-michael-gallup-christian-mccaffrey-jimmy-garoppolo-odell-beckham-jr`
		await page.goto(url)

		await page.waitForSelector(".m-longform-copy")

		const players = await page.$eval(".m-longform-copy", (div) => {
			const names = div.querySelectorAll("h5")
			const injuries = div.querySelectorAll("p")

			const injuryRisks = []

			injuries.forEach((p) => {
				const endIndex = p.innerText.indexOf("\n") === -1 ? p.innerText.length : p.innerText.indexOf("\n")
				if (p.innerText.includes("Injury risk:")) {
					injuryRisks.push(p.innerText.slice(p.innerText.indexOf(":") + 1, endIndex).trim())
				}
			})

			const allPlayers = []

			let index = 0

			names.forEach((h5) => {
				const a = h5.querySelector("a[href*='players'], strong > a[href*='players'], b > a[href*='players']")

				if (!a) return

				const risk = injuryRisks[index]
				allPlayers.push({
					name: a.innerText.trim(),
					risk,
				})

				index++
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

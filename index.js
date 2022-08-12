const puppeteer = require("puppeteer-extra")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker")

const NumberFire = require("./src/scrapers/numberfire")
const FFToday = require("./src/scrapers/fftoday")
const BetIQ = require("./src/scrapers/betiq")
const CBS = require("./src/scrapers/cbs")
const RazzBall = require("./src/scrapers/razzball")
const WalterFootball = require("./src/scrapers/walterfootball")
const ESPN = require("./src/scrapers/espn")
const FantasyNerds = require("./src/scrapers/fantasynerds")
const NFL = require("./src/scrapers/nfl")

const { groupData, calculateProjections, createCSV } = require("./src/functions")
const config = require("./config.json")
const configSchema = require("./src/validation")

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

puppeteer
	.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", '--user-data-dir="/tmp/chromium"', "--disable-web-security", "--disable-features=site-per-process", "--start-maximized"],
	})
	.then(async (browser) => {
		try {
			await configSchema.validateAsync(config)
		} catch (err) {
			console.log((err?.details[0]?.message || "Validation error") + " in config.json")
			process.exit()
		}

		console.log("Gathering data from source(s)...")

		const [betiq, cbs, espn, fantasynerds, fftoday, nfl, numberfire, walterfootball, razzball] = await Promise.all([
			BetIQ(browser),
			CBS(browser),
			ESPN(browser),
			FantasyNerds(browser),
			FFToday(browser),
			NFL(browser),
			NumberFire(browser),
			WalterFootball(browser),
			RazzBall(browser),
		])

		console.log("Data collected! Calculating custom projections...")

		const data = groupData([betiq, cbs, espn, fantasynerds, fftoday, nfl, numberfire, walterfootball, razzball])
		const projections = calculateProjections(data)
		await createCSV(projections)

		console.log("\n(Projected points only factor in available projected stats!)")
		process.exit()
	})

//Get the required modules
const puppeteer = require('puppeteer-core');
const mysql = require('mysql');

//Create the connection to the MySQL database
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "test"
});

con.connect(function(err) {
	con.query("use tvscraper;", function(err, result) {
		if(err) throw err;
		console.log("Result: " + result);
	});

	(async () => {
		const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'], devtools: false, executablePath: 'chromium-browser' });
		const page = await browser.newPage();

		await page.goto('http://dvrpi:9981/extjs.html');
		await page.waitFor(1000)

		await page.mouse.click(463, 12);
		await page.waitFor(1000)

		while(true) {

			const textContent = await page.evaluate(() => {
				const tds = Array.from(document.querySelectorAll(".x-grid3-body")[1].childNodes)
				return tds.map(c => c.childNodes)
			});

			console.log(textContent)

			var i;
			for(i = 0; i < textContent.length; i++) {
				var parsedstring = textContent[i].split(/[a-z]|[A-Z]|[ :\-%#]/)
				var filtered = parsedstring.filter(function (el) {
					return el != "";
				});
				console.log(filtered)
				if(filtered.length == 5) {
					con.query("insert into info (frequency, snr, signal_strength) values (" + filtered[2] + ", 0, " + filtered[4] + ");", function(err, result) {
						if(err) throw err;
					});
				}
			}
		}

		browser.close()
	})();
});


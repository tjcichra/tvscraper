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
				return tds.map(c => c.childNodes).map(c => c[0]).map(c => c.childNodes[0]).map(function(c) {
					var data = []
					var i

					for(i = 1; i < 13; i++) {
						data.push(c.rows[0].cells[i].textContent)
					}
					return data
				})
			});

			//console.log(textContent)

			var i;
			var j;
			for(i = 0; i < textContent.length; i++) {
				for(j = 0; j < textContent[i].length; j++) {
					textContent[i][j] = textContent[i][j].replace(/[a-z]|[\s:\-%#]/gi, '')
				}

				if(textContent[i][0] != '' && textContent[i][10] != '' && textContent[i][11] != '') {
					con.query("insert into info (frequency, snr, signal_strength) values (" + textContent[i][1] + "," + textContent[i][10] + "," + textContent[i][11] + ");", function(err, result) {
						if(err) throw err;
					});
				}
			}

			await page.waitFor(5000)
		}

		browser.close()
	})();
});


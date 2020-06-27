//Get the required modules
const puppeteer = require('puppeteer-core');
const mysql = require('mysql');

//Program flag, feel free to change these
var flag = {
	systemname: "dvrpi",
	port: "9981",
	extension: "/extjs.html",
	sqlhost: "localhost",
	sqluser: "root",
	sqlpassword: "test",
	sqldatabase: "tvscraper",
	sqltable: "info"
}

//Create the connection to the MySQL database
var con = mysql.createConnection({
	host: flag.sqlhost,
	user: flag.sqluser,
	password: flag.sqlpassword
});

//Run when the connection is created
con.connect(function(err) {
	con.query("use " + flag.sqldatabase + ";", function(err, result) {
		if(err) throw err;
	});

	(async () => {
		const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'], devtools: false, executablePath: 'chromium-browser' });
		const page = await browser.newPage();

		await page.goto('http://' + flag.systemname + ':' + flag.port + flag.extension);
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

			var i;
			var j;
			for(i = 0; i < textContent.length; i++) {
				var snrstr = textContent[i][10].search('%') != -1 ? 'snr_percentage' : 'snr_in_dB'
				var sigstrengthstr = textContent[i][11].search('%') != -1 ? 'signal_strength_percentage' : 'signal_strength_in_dB'

				for(j = 0; j < textContent[i].length; j++) {
					if(j == 0) {
						var a = textContent[i][j].replace(/[a-z]|[#\-:]/gi, '').split(' ')
						textContent[i][j] = a[a.length -4]
					} else {
						textContent[i][j] = textContent[i][j].replace(/[a-z]|[\s:\-%#]/gi, '')
					}
				}

				//console.log(textContent)

				if(textContent[i][0] != '' && textContent[i][10] != '' && textContent[i][11] != '') {
					con.query("insert into " + flag.sqltable + " (system, frontend, frequency, " + snrstr + ", " + sigstrengthstr + ") values (\"" + flag.systemname + "\", " + textContent[i][0] + ", " + textContent[i][1] + "," + textContent[i][10] + "," + textContent[i][11] + ");", function(err, result) {
						if(err) throw err;
					});
				} else {
					con.query("insert into " + flag.sqltable + " (system, frontend) values (\"" + flag.systemname + "\", " + textContent[i][0] + ");")
				}
			}

			await page.waitFor(5000)
		}

		browser.close()
	})();
});


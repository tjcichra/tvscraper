//-------------------------------------------------FLAGS----------------------------------------------------------------------
//create table info( id int NOT NULL AUTO_INCREMENT, datetime DATETIME NOT NULL, system VARCHAR(30) NOT NULL, frontend int NOT NULL, frequency double, snr_in_dB double, signal_strength_percentage double, snr_percentage double, signal_strength_in_dB double, PRIMARY KEY(id));
//ALTER TABLE info CHANGE `datetime` `datetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

//Website and system flags, feel free to change these
var siteflags = {
	systemname: "dvrpi",
	port: "9981",
	extension: "/extjs.html"
}

//MySQL flags, feel free to change these
var sqlflags = {
	sqlhost: "localhost",
	sqluser: "root",
	sqlpassword: "test",
	sqldatabase: "tvscraper",
	sqltable: "info"
}

//---------------------------------------------BEGINNING OF CODE------------------------------------------------------------

//Get the required modules
const puppeteer = require('puppeteer-core');
const mysql = require('mysql');

//Helper function for handling errors
function errorHandle(err, result) {
	if(err) {
		throw err
	}
}

//Create the connection to the MySQL database
var con = mysql.createConnection({
	host: sqlflags.sqlhost,
	user: sqlflags.sqluser,
	password: sqlflags.sqlpassword
});

//Run when the connection is created
con.connect(function(err) {

	//Create asyncronous function
	(async () => {
		//Enter specified database
		con.query("use " + sqlflags.sqldatabase + ";", errorHandle)

		//Launches the browser and creates a new page
		const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'], devtools: false, executablePath: 'chromium-browser' });
		const page = await browser.newPage();

		//Goto the website and wait for things to load
		await page.goto('http://' + siteflags.systemname + ':' + siteflags.port + siteflags.extension);
		await page.waitFor(1000)

		//Click on the "Status" button and wait for things to load
		await page.mouse.click(463, 12);
		await page.waitFor(1000)

		//Keep looping forever and ever and ever and ever and ever and ever and ever
		while(true) {

			//Get data from page
			const textContent = await page.evaluate(() => {
				//Get the body of the table
				const tds = Array.from(document.querySelectorAll(".x-grid3-body")[1].childNodes)

				return tds.map(c => c.childNodes[0].childNodes[0]).map(function(c) {
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
					con.query("insert into " + sqlflags.sqltable + " (system, frontend, frequency, " + snrstr + ", " + sigstrengthstr + ") values (\"" + siteflags.systemname + "\", " + textContent[i][0] + ", " + textContent[i][1] + "," + textContent[i][10] + "," + textContent[i][11] + ");", function(err, result) {
						if(err) throw err;
					});
				} else {
					con.query("insert into " + sqlflags.sqltable + " (system, frontend) values (\"" + siteflags.systemname + "\", " + textContent[i][0] + ");")
				}
			}

			await page.waitFor(5000)
		}

		browser.close()
	})();
});


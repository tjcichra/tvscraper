//create table info( id int NOT NULL AUTO_INCREMENT, datetime DATETIME NOT NULL, system VARCHAR(30) NOT NULL, frontend int NOT NULL, frequency double, snr_in_dB double, signal_strength_percentage double, snr_percentage double, signal_strength_in_dB double, PRIMARY KEY(id));
//ALTER TABLE info CHANGE `datetime` `datetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

const optionDefinitions = [
	{ name: 'systemname', alias: 's', type: String},
	{ name: 'port', alias: 'p', type: String, defaultValue: '9981'},
	{ name: 'extension', alias: 'e', type: String, defaultValue: '/extjs.html'},
	{ name: 'time', alias: 't', type: Number, defaultValue: 5000},
	{ name: 'sqlhost', alias: 'h', type: String, defaultValue: 'localhost'},
	{ name: 'sqluser', alias: 'u', type: String, defaultValue: 'root'},
	{ name: 'sqlpassword', alias: 'w', type: String, defaultValue: 'test'},
	{ name: 'sqldatabase', alias: 'b', type: String, defaultValue: 'tvscraper'},
	{ name: 'sqltable', alias: 'a', type: String, defaultValue: 'info'}
]

//Get the required modules
const puppeteer = require('puppeteer-core')
const mysql = require('mysql')
const commandLineArgs = require('command-line-args')

//Get command line arguments
const options = commandLineArgs(optionDefinitions)

//Helper function for handling errors
function errorHandle(err, result) {
	if(err) {
		throw err
	}
}

//Create the connection to the MySQL database
var con = mysql.createConnection({
	host: options.sqlhost,
	user: options.sqluser,
	password: options.sqlpassword
});

//Run when the connection is created
con.connect(function(err) {
	//Info output
	console.log("Connected to database.");

	//Create asyncronous function
	(async () => {
		//Enter specified database
		con.query('use ' + options.sqldatabase + ';')

		//Info output
		console.log("In the database")

		//Launches the browser and creates a new page
		const browser = await puppeteer.launch({ headless: true, args: ['--start-maximized'], devtools: false, executablePath: 'chromium-browser' });
		const page = await browser.newPage();

		//Goto the website and wait for things to load
		await page.goto('http://' + options.systemname + ':' + options.port + options.extension);
		await page.waitFor(1000)

		//Click on the 'Status' button and wait for things to load
		await page.mouse.click(463, 12);
		await page.waitFor(1000)

		//Info output
		console.log("At the status page and collecting data")

		//Keep looping forever and ever and ever and ever and ever and ever and ever
		while(true) {

			//Get data from page
			const textContent = await page.evaluate(() => {
				//Get the body of the table
				const tds = Array.from(document.querySelectorAll('.x-grid3-body')[1].childNodes)

				//Gets the data from the rows of the table and puts it in a 2d array
				return tds.map(function(c) {
					//Get the tbody of the row
					tbody = c.childNodes[0].childNodes[0]

					var data = []
					var i

					//For each desired column, put in it an array
					for(i = 1; i < 13; i++) {
						data.push(tbody.rows[0].cells[i].textContent)
					}

					//Return the array
					return data
				})
			});

			var i;
			var j;
			//Loop through each row (input)
			for(i = 0; i < textContent.length; i++) {
				//Check if the SNR and signal strength are percentages or in dB
				var snrstr = textContent[i][10].search('%') != -1 ? 'snr_percentage' : 'snr_in_dB'
				var sigstrengthstr = textContent[i][11].search('%') != -1 ? 'signal_strength_percentage' : 'signal_strength_in_dB'

				//Goes through each column
				for(j = 0; j < textContent[i].length; j++) {
					if(j == 0) {
						//If you are going over the first column, disect the frontend number from it
						var a = textContent[i][j].replace(/[a-z]|[#\-:]/gi, '').split(' ')
						textContent[i][j] = a[a.length -4]
					} else {
						//Or else just remove all letter and junk characters
						textContent[i][j] = textContent[i][j].replace(/[a-z]|[\s:\-%#]/gi, '')
					}
				}

				if(textContent[i][0] != '' && textContent[i][10] != '' && textContent[i][11] != '') {
					//If there is an snr and signal strength, record it
					con.query('insert into ' + options.sqltable + ' (system, frontend, frequency, ' + snrstr + ', ' + sigstrengthstr + ') values (\'' + options.systemname + '\', ' + textContent[i][0] + ', ' + textContent[i][1] + ',' + textContent[i][10] + ',' + textContent[i][11] + ');')
				} else {
					//Or else just insert NULL values in their spot
					con.query('insert into ' + options.sqltable + ' (system, frontend) values (\'' + options.systemname + '\', ' + textContent[i][0] + ');')
				}
			}

			//Wait for a specified number of milliseconds
			await page.waitFor(options.time)
		}

		//Closes the browser after this
		browser.close()
	})();
});


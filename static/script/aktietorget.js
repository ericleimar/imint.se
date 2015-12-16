var ISIN = "SE0007692124"; //IMINT

function addThousandSeparator(number, separator) {
	var rx = /(\d+)(\d{3})/;
	return String(number).replace(/^\d+/, function(w) {
		while(rx.test(w)) {
			w= w.replace(rx, "$1"+separator+"$2");
		}
		return w;
	});
}
function sendAjaxRequest(url, callback) {
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", url, true);
	xhttp.responseType = "json";
	xhttp.onload = callback;
	xhttp.send();
}
function createElement(elementType, content) {
	if (!content)
		content = "";
	var element = document.createElement(elementType);
	element.appendChild(document.createTextNode(content));
	return element;
}
function appendElementById(id, element) {
	document.getElementById(id).appendChild(element);
}
function createTable(data, caption) {
	var table = createElement("table");
	table.appendChild(createElement("caption", caption));
	var tableBody = createElement("tbody");
	for (var i = 0; i < data.length; i++) {
		var tableRow = createElement("tr");
		for (var j = 0; j < data[i].length; j++) {
			if (isNaN(data[i][j]))
				tableRow.appendChild(createElement("td", data[i][j]));
			else {
				var tableData = createElement("td", addThousandSeparator(data[i][j], " "));
				tableData.style.textAlign = "right";
				tableRow.appendChild(tableData);
			}
		}
		tableBody.appendChild(tableRow);
	}
	table.appendChild(tableBody);
	return table;
}
function appendQuotesTableTo(id) {
	sendAjaxRequest("http://json.aktietorget.se/Quotes.json?id2="+ISIN, function(event) {
		var data = event.target.response[0];
		var element;
		if (data) {
			var tableData = [["+/-", data.DiffInMoney],
							["%", data.DiffInPercent.toFixed(2)],
							["Senast", data.LatestPrice],
							["Högst", data.High],
							["Lägst", data.Low],
							["Omsättning volym", data.Volume],
							["Omsättning kr", data.Amount.toFixed()],
							["Marknadsvärde mkr", data.MarketValue]];
			element = createTable(tableData, "Just nu");
		}
		else {
			var tableData = [["+/-", ""],
							["% procent", ""],
							["Senast", ""],
							["Högst", ""],
							["Lägst", ""],
							["Omsättning volym", ""],
							["Omsättning kr", ""],
							["Marknadsvärde mkr", ""]];
			element = createTable(tableData, "Just nu");
		}
		appendElementById(id, element);
	});
}
function appendDealsTableTo(id) {
	sendAjaxRequest("http://json.aktietorget.se/getinstrumentdeals.json?id="+ISIN, function(event) {
		var data = event.target.response;
		var element;
		if (data) {
			var tableData = [];
			tableData.push(["Tid", "Köpare", "Säljare", "Pris", "Volym"]);
			for (var i = 0; i < data.length; i++) {
				var date = new Date(data[i].DealDateTime);
				var time = ("0" + date.getHours().toString()).slice(-2) + ":" + ("0" + date.getMinutes().toString()).slice(-2);
				tableData.push([time, data[i].BuyerShortName, data[i].SellerShortName, data[i].Price, data[i].Volume]);
			}
			element = createTable(tableData, "Dagens avslut");
		}
		else {
			element = createElement("p", "Kunde inte hämta information om aktien");
		}
		appendElementById(id, element);
	});
}
function drawLastPriceChart(id) {
	google.load('visualization', '1.0', {'packages':['corechart']});
	google.setOnLoadCallback(drawPriceOverTimeChart);
	function drawPriceOverTimeChart() {
		sendAjaxRequest("http://json.aktietorget.se/dealsummary.json?id="+ISIN, function(event) {
			var data = event.target.response;
			var date = new Date();
			date.setDate(date.getDate()-10);
			var dateString = date.getFullYear().toString() + "-" + ("0" + date.getMonth().toString()).slice(-2) + "-" + ("0" + date.getDay().toString()).slice(-2);
			sendAjaxRequest("http://json.aktietorget.se/dealsummary.json?id="+ISIN+"&DateFrom=" + dateString, function(event) {
				data = data.concat(event.target.response);
				date.setDate(date.getDate()-10);
				dateString = date.getFullYear().toString() + "-" + ("0" + date.getMonth().toString()).slice(-2) + "-" + ("0" + date.getDay().toString()).slice(-2);
				sendAjaxRequest("http://json.aktietorget.se/dealsummary.json?id="+ISIN+"&DateFrom=" + dateString, function(event) {
					data = data.concat(event.target.response);
					if (data.length > 0) {
						var chartData = new google.visualization.DataTable();
						chartData.addColumn("date", "Datum");
						chartData.addColumn("number", "kr");
						for (var i = 0; i < data.length; i++) {
							chartData.addRow([new Date(data[i].TradeDate), data[i].LastPrice]);
						}
						var options = {
							"title": "Slutpris per dag",
							"height": "300",
							"legend": { "position": "none" },
							"hAxis": { "format": "yyyy-M-dd" }
							};
						var chart = new google.visualization.LineChart(document.getElementById(id));
						chart.draw(chartData, options);
					}
					else {
						appendElementById(id, createElement("p", "Kunde inte hämta information om aktien"));
					}
				});
			});
		});
	}
}
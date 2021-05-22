let displayDate = (date) => {
	if(!date || !(date instanceof Date)) {
		return (new Date()).toLocaleString();
	} else {
		return date.toLocaleString();
	}
}

let afterFewMins = (mins, date) => {
	if(!mins) throw Error('Mandatory few minutes.');
	if(!date || !(date instanceof Date)) {
		date = new Date();
	}
	return displayDate(new Date(date.getTime() + mins*60*1000));
}

async function getCenters(pincode) {
	let today = new Date();
	let datestr = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`;
	let url;
	url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?pincode=${pincode}&date=${datestr}`;
	let res = await fetch(url);
	res = await res.json();
	return res.centers;
}

let getTile = (ts, data) => {
	let tile = document.createElement('div');
	tile.classList.add('tile');
	data.totalShots > 0 ? tile.classList.add('green') : tile.classList.add('red');
	let row = document.createElement('div');
	row.classList.add('row');
	let timestamp = document.createElement('span');
	timestamp.classList.add('timestamp');
	timestamp.innerHTML = ts;
	let centersCount = document.createElement('span');
	centersCount.classList.add('centers');
	centersCount.innerHTML = `Total centers: ${data.totalCenters}`;
	let centers_18 = document.createElement('span');
	centers_18.innerHTML = `18+ centers: <strong>${data.eighteenPlus}</strong>`;
	let totalDoses = document.createElement('span');
	totalDoses.innerHTML = `Total 18+ doses: <strong>${data.totalShots}</strong>`;
	row.appendChild(timestamp);
	row.appendChild(centersCount);
	row.appendChild(centers_18);
	row.appendChild(totalDoses);
	tile.appendChild(row);
	for(let center of data.centers) {
		let parseDate = (date) => new Date(date.split('-').reverse().join('-'));
		let centerSessions = center.sessions?.filter(s => s.min_age_limit==18)
								.sort((s1, s2) => parseDate(s1.date)-parseDate(s2.date));
		if(!centerSessions.length) continue;
		let crow = document.createElement('div');
		crow.classList.add('center-row');
		let centerName = document.createElement('span');
		centerName.innerHTML = `${center.name} (${center.fee_type})`;
		crow.appendChild(centerName);
		for(let ss of centerSessions) {
			let session = document.createElement('span');
			session.innerHTML = `${ss.date}: <strong>${ss.available_capacity}</strong>`;
			crow.appendChild(session);
		}
		tile.appendChild(crow);
		row = document.createElement('div');
		row.classList.add('row');
		tile.appendChild(row);
		let anchor = document.createElement('a');
		anchor.href = 'https://selfregistration.cowin.gov.in/';
		anchor.innerHTML = 'Book Slot';
		anchor.target = '_blank';
		row.appendChild(anchor);
	}
	return tile;
}

let processInfo = async (pincode, interval) => {
	let centers = await getCenters(pincode);
	let date = displayDate();
	let data = {};
	data.totalCenters = centers.length;
	centers = centers.filter(c => c.sessions?.some(s => s.min_age_limit<45));
	data.eighteenPlus = centers.length;
	centers = centers.filter(c => c.sessions?.some(s => s.available_capacity>0));
	data.hasVaccines = centers.length;
	data.totalShots = centers.length
		? centers.map(c => c.sessions).flat().filter(s => s.min_age_limit==18).map(s => s.available_capacity).reduce((a,b) => a+b)
		: 0;
	data.centers = centers;
	let totalShots = centers.length ? centers.map(c => c.sessions).flat().filter(s => s.min_age_limit==18).map(s => s.available_capacity).reduce((c1,c2) => c1+c2) : 0;

	console.log(centers);
	let responseDiv = document.createElement('div');
	let audio = document.querySelector('audio');
	if(centers.length) {
		if(audio.paused) audio.play();
	} else {
		audio.pause();
		audio.currentTime = 0;
	}
	document.querySelector('.body-head .info').style.display='block';
	document.querySelector('.availability-data').appendChild(getTile(date, data));
	document.querySelector('.next-timestamp').style.display='block';
	document.querySelector('.next-timestamp span').innerHTML = afterFewMins(interval, date);
}

let startChecking = (evt) => {
	let pincode = document.querySelector('form input.pincode').value;
	let interval = document.querySelector('form input.interval').value;
	if(!pincode || !pincode.match(/^\d{6}$/)) {
		alert('Invalid Pincode!');
		return false;
	}
	if(!interval || interval<1) {
		alert('Invalid Interval!');
		return false;
	}
	let form = document.querySelector('form');
	document.querySelector('body .header').removeChild(form);
	document.querySelector('.body-head .interval').innerHTML = interval;
	document.querySelector('.body-head .pincode').innerHTML = pincode;
	processInfo(pincode, interval);
	let myInterval = setInterval(()=>processInfo(pincode, interval), interval*60*1000);
}

window.onload = function() {
	document.querySelector('button.init-button').addEventListener('click', startChecking);
}
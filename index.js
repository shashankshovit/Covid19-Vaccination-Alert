const element = (element, options) => {
	`Returns a element with given options. Accepted attributes in options defined below.
		cls: <Array>
		dataset: <Object>
		html: <String>

	`
	let defaultOpts = {
		cls: [],
		dataset: {},
		html: null
	};
	options = Object.assign(defaultOpts, options);
	let dv = document.createElement(element);

	// classes
	if(!(options.cls instanceof Array || typeof(options.cls) === 'string')) {
		throw `Attribute cls can be: Array/String`;
	}
	if(typeof options.cls === 'string') { options.cls = [options.cls]; }
	for(let clas of options.cls) {
		dv.classList.add(clas);
	}
	delete options.cls;

	// dataset
	for(let dt in options.dataset) {
		dv.dataset[dt] = options.dataset[dt];
	}
	delete options.dataset;

	// innerHTML
	if(options.html) { dv.innerHTML = options.html; }
	delete options.html;

	// Other attributes
	for(let attr in options) {
		dv[attr] = options[attr];
	}
	
	return dv;
}

let div = (options) => element('div', options);
let span = (options) => element('span', options);
let input = (options) => element('input', options);

const addQueryTile = () => {
	let formRow = div({cls: ['form-row', 'query']});
	let wrapper = div({cls: 'wrapper'});
	formRow.appendChild(wrapper);
	wrapper.appendChild(input({type: 'text', cls: 'pincode', required: true, title: 'Your 6 digit area pincode.'}));
	wrapper.appendChild(span({html: 'Pincode'}));
	const groupCost = div({cls: 'group'});
	formRow.appendChild(groupCost);
	groupCost.appendChild(div({cls: ['filter', 'price', 'first'], html: 'Free', title: 'Free vaccine made available by central Govt', dataset: {price: 'Free'}}));
	groupCost.appendChild(div({cls: ['filter', 'price', 'last'], html: 'Paid', title: 'Paid vaccine available at Pvt Hospital', dataset: {price: 'Paid'}}));
	const groupAge = div({cls: 'group'});
	formRow.appendChild(groupAge);
	groupAge.appendChild(div({cls: ['filter', 'age', 'first'], html: '18+', title: 'Mininum age 18', dataset: {age: 18}}));
	groupAge.appendChild(div({cls: ['filter', 'age', 'last'], html: '45+', title: 'Mininum age 45', dataset: {age: 45}}));
	const groupDose = div({cls: 'group'});
	formRow.appendChild(groupDose);
	groupDose.appendChild(div({cls: ['filter', 'dose', 'first'], html: 'D1', dataset: {dose: 1}, title: 'Dose 1'}));
	groupDose.appendChild(div({cls: ['filter', 'dose', 'last'], html: 'D2', dataset: {dose: 2}, title: 'Dose 2'}));
	const groupVacx = div({cls: 'group'});
	formRow.appendChild(groupVacx);
	groupVacx.appendChild(div({cls: ['filter', 'vaccine', 'first'], html: 'Covaxin', dataset: {name: 'COVAXIN'}}));
	groupVacx.appendChild(div({cls: ['filter', 'vaccine'], html: 'Covishield', dataset: {name: 'COVISHIELD'}}));
	groupVacx.appendChild(div({cls: ['filter', 'vaccine', 'last'], html: 'Sputnik V', dataset: {name: 'SPUTNIK V'}}));
	
	for(let button of Array.from(formRow.querySelectorAll('.filter'))) {
		button.addEventListener('click', (evt) => {
			evt.target.classList.contains('selected')
				? evt.target.classList.remove('selected')
				: evt.target.classList.add('selected');
		});
	}
	let cross = div({cls: 'delete-row', html: '-', title: 'Delete this row.'});
	cross.addEventListener('click', (evt) => {
		evt.target.parentElement.parentElement.removeChild(evt.target.parentElement);
	});
	formRow.appendChild(cross);

	let form = document.querySelector('form');
	let addButton = form.children[form.children.length - 2]
	let submitButton = form.children[form.children.length - 1];
	form.removeChild(addButton);
	form.removeChild(submitButton);
	form.appendChild(formRow);
	form.appendChild(addButton);
	form.appendChild(submitButton);
}

const displayDate = (date) => {
	if(!date || !(date instanceof Date)) {
		date = new Date();
	}
	let month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${date.getDate()} ${month[date.getMonth()]} | ${date.toLocaleTimeString()}`;
}

const afterFewMins = (secs, date) => {
	if(!secs) throw Error('Mandatory few minutes.');
	if(!date || !(date instanceof Date)) {
		date = new Date();
	}
	return displayDate(new Date(date.getTime() + secs*1000));
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

const getTile = (ts, data, pincode) => {
	let tile = div({cls: 'tile'});
	if(data.totalShots === 0) {
		// default gray tile
	} else if(data.totalShots <= 5) {
		tile.classList.add('red');
	} else if(data.totalShots <= 25) {
		tile.classList.add('orange');
	} else {
		tile.classList.add('green');
	}
	let summary = div({cls: ['row', 'summary']});
	summary.appendChild(span({cls: 'timestamp', html: displayDate(ts)}));
	summary.appendChild(span({html: `Pincode: <strong>${pincode}</strong>`}))
	summary.appendChild(span({cls: 'centers', html: `Centers: <strong>${data.centers.length}</strong>/${data.totalCenters}`}));
	summary.appendChild(span({html: `Doses: <strong>${data.totalShots}</strong>`}));
	tile.appendChild(summary);
	for(let center of data.centers) {
		let parseDate = (date) => new Date(date.split('-').reverse().join('-'));
		let centerSessions = center.sessions?.sort((s1, s2) => parseDate(s1.date)-parseDate(s2.date));
		if(!centerSessions.length) continue;
		let crow = div({cls: ['center-row', 'row']});
		let nameDiv = div({cls: 'name'});
		nameDiv.appendChild(span({html: `${center.name.toLowerCase()}`, title: `${center.name} (${center.fee_type})`}));
		if(center.fee_type == 'Paid') {
			nameDiv.appendChild(span({cls: 'paid', html: '$', title: `Vaccine is Paid`}));
		}
		crow.appendChild(nameDiv);
		let sessionsDiv = div({cls: 'sessions'});
		crow.appendChild(sessionsDiv);
		for(let ss of centerSessions) {
			let miniTile = div({cls: 'mini-tile'});
			miniTile.appendChild(div({cls: 'date', html: `${ss.date}`}));
			miniTile.appendChild(div({cls: 'vaccine', html: `${ss.vaccine.toLowerCase()}`}));
			let age_shot = div({cls: 'age-shot'});
			miniTile.appendChild(age_shot);
			age_shot.appendChild(div({cls: 'age', html: `${ss.min_age_limit}+`}))
			age_shot.appendChild(div({cls: 'shot', html: `<strong>${'queriedCapacity' in ss? ss.queriedCapacity: ss.available_capacity}</strong>`}));
			sessionsDiv.appendChild(miniTile);
		}
		tile.appendChild(crow);
	}
	if(data.totalShots) {
		row = div({cls: 'row'})
		tile.appendChild(row);
		row.appendChild(element('a', {href: 'https://selfregistration.cowin.gov.in/', html: 'Book Slot', target: '_blank'}));
	}
	return tile;
}

const processInfoAfterQuery = async (query, ts) => {
	let pincode = query.pincode;
	let centers = await getCenters(pincode);
	console.log(centers);
	let data = {};
	data.totalCenters = centers.length;
	centers = centers.filter(c => c.sessions?.some(s => s.available_capacity));

	// --- Age Filters ---
	if(query.filters.age.length) {
		centers = centers.filter(c => {
			c.sessions = c.sessions.filter(s => query.filters.age.includes(s.min_age_limit));
			if(c.sessions.length) {
				return true;
			} else {
				return false;
			}
		});
	}
	// --- Vaccine Filters ---
	if(query.filters.vaccine.length) {
		centers = centers.filter(c => {
			c.sessions = c.sessions.filter(s => query.filters.vaccine.includes(s.vaccine));
			if(c.sessions.length) {
				return true;
			} else {
				return false;
			}
		});
	}
	// --- Price Filters ---
	if(query.filters.price.length) {
		centers = centers.filter(c => query.filters.price.includes(c.fee_type));
	}
	// --- Dose Filters ---
	if(query.filters.dose.length) {
		for(let dose of query.filters.dose) {
			centers = centers.filter(c => {
				c.sessions = c.sessions.filter(s => {
					if(query.filters.dose.length===1) {
						s.queriedCapacity = s[`available_capacity_dose${dose}`];
					} else {
						s.queriedCapacity = s.available_capacity;
					}
					return 'queriedCapacity' in s ? s.queriedCapacity > 0 : s.available_capacity > 0;
				});
				if(c.sessions.length) {
					return true;
				} else {
					return false;
				}
			})
		}
	}

	// other data fields: totalShots, centers
	data.totalShots = 0;
	if(centers.length) {
		data.totalShots = centers.map(c=>c.sessions).flat().map(s=>{
			return (('queriedCapacity' in s) ? s.queriedCapacity : s.available_capacity);
		}).reduce((a,b)=>a+b);
	}
	data.centers = centers;

	console.log(centers);
	document.querySelector('.availability-data').prepend(getTile(ts, data, pincode));
	return data.totalShots;
}

const fetchResults = async (queries, interval) => {
	let ts = new Date();
	let shots = await Promise.all(queries.map(query => processInfoAfterQuery(query, ts)));
	let audio = document.querySelector('audio');
	if(shots.reduce((a,b) => a+b)) {
		audio.paused && audio.play();
		audio.muted = false;
		audio.volume = 1;
	} else {
		audio.pause();
		audio.currentTime = 0;
	}
	document.querySelector('.next-timestamp').style.display='block';
	document.querySelector('.next-timestamp span').innerHTML = afterFewMins(interval, ts);
}

const submitButtonClickHandler = (evt) => {
	let queryDivs = Array.from(document.querySelectorAll('form .form-row.query'));
	if(queryDivs.length < 1) {
		alert('Please add atleast one row.');
		return false;
	}
	let queries = [];
	for(let dv of queryDivs) {
		let query = {};
		query.pincode = dv.querySelector('input.pincode').value;
			if(!query.pincode || !query.pincode.match(/^\d{6}$/)) {
			alert('Invalid Pincode!');
			return false;
		}
		query.filters = {};
		query.filters.age = Array.from(dv.querySelectorAll('.filter.age.selected'))
							.map(d => parseInt(d.dataset.age));
		query.filters.vaccine = Array.from(dv.querySelectorAll('.filter.vaccine.selected'))
								.map(d => d.dataset.name);
		query.filters.price = Array.from(dv.querySelectorAll('.filter.price.selected'))
								.map(d => d.dataset.price);
		query.filters.dose = Array.from(dv.querySelectorAll('.filter.dose.selected'))
								.map(d => d.dataset.dose);
		queries.push(query);
	}
	// let interval = document.querySelector('form input.interval').value;
	let interval = parseInt(document.querySelector('form select').value);
	// let interval = 5;
	// if(!interval || interval<1) {
	// 	alert('Invalid Interval!');
	// 	return false;
	// }
	document.querySelector('body').removeChild(document.querySelector('.header'));
	document.querySelector('.note .note-heading span').click();
	fetchResults(queries, interval);
	let myInterval = setInterval(()=>fetchResults(queries, interval), interval*1000);
}

const noteCollapseClickHandler = (evt) => {
	let note = evt.target.parentElement.parentElement;
	if(note.classList.contains('collapsed')) {
		note.classList.remove('collapsed');
	} else {
		note.classList.add('collapsed');
	}
}

window.onload = function() {
	addQueryTile();
	document.querySelector('button.init-button').addEventListener('click', submitButtonClickHandler);
	document.querySelector('form .add').addEventListener('click', addQueryTile);
	document.querySelector('.note .note-heading span').addEventListener('click', noteCollapseClickHandler);
}
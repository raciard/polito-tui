import { getBookings, getSlots } from "open-polito-api/lib/booking.js";
import { getExtendedCourseInfo } from "open-polito-api/lib/course.js";
import { getCoursesInfo } from "open-polito-api/lib/courses.js";
import { Device } from "open-polito-api/lib/device.js";
import { getDownloadURL } from "open-polito-api/lib/material.js";
import { getTicket, getTickets } from "open-polito-api/lib/tickets.js";
import { getTimetable } from "open-polito-api/lib/timetable.js";
import { getUnreadMail } from "open-polito-api/lib/user.js";
import { ping } from "open-polito-api/lib/utils.js";
import { v4 as uuidv4 } from "uuid";
import {exec} from "child_process"
import {credentials} from "./config/config.js"
import blessed from "reblessed"

const uuid = uuidv4();
const device = new Device(uuid);

const browseMaterial = async (material) => {
	if(material.type == 'dir'){
		material.children.forEach(browseMaterial);
	}
	else if(material.type == 'file') {
		console.log(material.name, '\n\t', await getDownloadURL(device, material.code))
	}

};
var box;

(async () => {
	await ping();
	await device.register();
	const { token } = await device.loginWithCredentials(credentials.username, credentials.password);
	const courses_info = await getCoursesInfo(device);
	

	box.changeStatus = function(status)  {
		if(status.type == "courses"){
			this.setItems(status.material.map((mat) => mat.name))
		}
		else {
			this.setItems(['..', ...status.material.map((mat) => mat.name)]);
		}
		screen.render();
		this.status = status;
	}

	let status = {
		type: "courses",
		material: courses_info.course_plan.standard,

	};
	box.changeStatus(status);
	box.key(['enter', 'l'], async function (ch, key){
		if(status.type == "courses"){
			const course = await getExtendedCourseInfo(device, courses_info.course_plan.standard[box.selected]);
			status = {
				parent: status,
				type: "material",
				material: course.material
			};
			status.type = "material"
			box.changeStatus(status);
		}
		else		{
			if(box.selected === 0){
				status = status.parent;

				box.changeStatus(status);
				
			} else{
				let file = status.material[box.selected - 1];
				if(file.type == 'dir'){
					status = {parent: status, material: file.children, type: "material"}
					box.changeStatus(status)
				}
				else if(file.type == 'file'){
					let url = await getDownloadURL(device, file.code)	

					exec("curl   \""+ url+ "\" -L --output ~/polito-tui/tmp/" + escape(file.name) +" && nohup xdg-open ~/polito-tui/tmp/" + escape(file.name) + " &", (err,stdout, stderr) => {//console.log(stdout)
					})
				}

			}
		}
	


	});
	box.key(['h'], function(ch, key){
		if(box.status.type == "material"){
			status = box.status.parent
			box.changeStatus(box.status.parent)	

		}
	})
	//await device.logout();
})();



// Create a screen object.
const screen = blessed.screen({
	smartCSR: true
});
const prompt = blessed.prompt({
	parent: screen,
	top: 'center',
	left: 'center',
	height: 'shrink',
	width: 'shrink',
	border: 'line',
	style: {
		fg: 'white'
	}
});

screen.title = 'polito-TUI';
// Create a box perfectly centered horizontally and vertically.
box = blessed.list({
	width: '100%',
	height: '100%',
	border: {
		type: 'line'
	},
	style: {
		fg: 'white',
		//bg: 'black',
		border: {
			fg: '#f0f0f0'
		},
		selected: {
			bg: 'blue'
		}
	},
	items: [
		'Aspetta che sto caricando',
	],
	vi: true,
	keys: true,
	mouse: true,
	search: function (callback) {
		prompt.input('Cerca:', '', function (err, value) {
			if (err) return;
			return callback(null, value);
		});
	}
});



// Append our box to the screen.
screen.append(box);

// If our box is clicked, change the content.

// If box is focused, handle `enter`/`return` and give us some more content.

console.log(box.getItem())
// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], async function(ch, key) {
	await device.logout();
//	exec("rm ./tmp/*");
	return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();




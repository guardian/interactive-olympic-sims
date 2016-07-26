import {
    select
} from 'd3-selection';
import {
	msToTime
} from '../lib/time';
import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';


export default function StopWatch(options) {

	let start_time=0;

	let delta_time=0;

	let frameRequest;

	let stopwatch;

	let timeDOM;

	let list=[],
		list_container;

	let multiplier=options.multiplier || 1;

	function buildWatch() {
		stopwatch=select(options.container)
			.append("div")
			.attr("class","stopwatch")

		timeDOM=stopwatch.append("span").attr("class","time");

		list_container=stopwatch.append("ul");

	}
	buildWatch();

	function setTime(time) {
		let t=msToTime(time);
		timeDOM.text((t[1]?(t[1]+":"):"")+t[2]+"."+(t[3]));
	}

	function updateTime(time) {
		let current_time=new Date().getTime(),
			diff=(current_time - start_time)+delta_time,
			t=msToTime(diff*multiplier);

		timeDOM.text((t[1]?(t[1]+":"):"")+t[2]+"."+(t[3]));

		frameRequest = requestAnimFrame(updateTime);
		
	}

	this.start = (time=0) => {

		delta_time=time;

		start_time=new Date().getTime();

		list=[];
		list_container.selectAll("li").remove();

		stopwatch.classed("hidden",false);

		frameRequest = requestAnimFrame(updateTime);
	}

	this.stop = (time=false) => {
		cancelAnimFrame(frameRequest);
		if(time) {
			setTime(time)	
		}
	}

	this.hide = () => {
		stopwatch.classed("hidden",true)
	}

	this.append = (entrant,time) => {
		console.log(entrant,time);

		list.push({
			entrant:entrant,
			time:time
		});

		list_container.append("li")
			.datum(list[list.length-1])
			.text(d=>{
				return d.entrant.entrant.participant.competitor.lastName;
			})
			.append("span")
				.attr("class","result")
				.text(d=>{
					return d.time.value;
				})
	}
}
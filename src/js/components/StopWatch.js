import {
    select
} from 'd3-selection';
import {
	msToTime
} from '../lib/time';
import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';


export default function StopWatch(options) {

	let start_time=0;

	let frameRequest;

	let timeDOM;

	let multiplier=options.multiplier || 1;

	function buildWatch() {
		timeDOM=select(options.container)
			.append("div")
			.attr("class","stopwatch")
				.append("span");


	}
	buildWatch();

	function updateTime(time) {
		let current_time=new Date().getTime(),
			diff=current_time - start_time,
			t=msToTime(diff*multiplier);

		timeDOM.text(t[2]+":"+Math.round(t[3]/10));

		frameRequest = requestAnimFrame(updateTime);
		
	}

	this.start = () => {
		start_time=new Date().getTime();

		frameRequest = requestAnimFrame(updateTime);
	}

	this.stop = () => {
		cancelAnimFrame(frameRequest);
	}
}
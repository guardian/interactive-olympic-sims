import {
    select
} from 'd3-selection';
import {
	msToTime,
	formatSecondsMilliseconds
} from '../lib/time';
import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';


export default function StopWatch(options) {

	let start_time=0;

	let delta_time=0;

	let frameRequest;

	let stopwatch;

	let timeDOM,
		wrDOM,
		gapDOM,
		distDOM,
		wr_visible=false;

	let CURRENT_TIME;

	/*let list=[],
		list_container;*/

	let multiplier=options.multiplier || 1;

	function buildWatchDOM() {
		stopwatch=select(options.container)
			.append("div")
			.attr("class","stopwatch")

		timeDOM=stopwatch.append("span").attr("class","time");

		//list_container=stopwatch.append("ul");

	}
	function buildWatch() {
		//console.log(options)
		stopwatch=select(options.container)
					.append("svg")
					.attr("class","stopwatch")

		let stopwatch_g=stopwatch.append("g");

		timeDOM=stopwatch_g.append("text").attr("class","time");
		wrDOM=stopwatch_g.append("text").attr("class","wr").attr("transform","translate(0,20)");
		gapDOM=stopwatch_g.append("text").attr("class","wr").attr("transform","translate(0,34)");
		distDOM=stopwatch_g.append("text").attr("class","wr").attr("transform","translate(0,-22)");
	}
	buildWatch();

	function setTime(time) {

		if(CURRENT_TIME!==time) {

			//console.log(CURRENT_TIME,"!==",time)

			let t=msToTime(time);
			timeDOM.text((t[1]?(t[1]+":"):"")+(t[1]&&t[2]<10?"0":"")+t[2]+"."+(t[3]));	

			CURRENT_TIME=time;
		}
		
	}
	this.setTime = (time) => {
		setTime(time);
	}

	function updateTime(raf=true) {
		let current_time=new Date().getTime(),
			diff=(current_time - start_time)/multiplier+delta_time,
			_t=Math.round(diff/100)*100,
			t=msToTime(_t,1);

		if(CURRENT_TIME!==_t) {
			//console.log(_t,CURRENT_TIME)
			timeDOM.text((t[1]?(t[1]+":"):"")+(t[1]&&t[2]<10?"0":"")+t[2]+"."+(t[3]));
			CURRENT_TIME=_t;
		}

		if(raf) {
			frameRequest = requestAnimFrame(updateTime);	
		}
	}
	this.update = () => {
		updateTime(false);
	}

	this.start = (time=0,raf=true) => {
		if(frameRequest) {
			cancelAnimFrame(frameRequest);	
		}

		delta_time=time;

		start_time=new Date().getTime();

		stopwatch.classed("hidden",false);

		if(raf) {
			frameRequest = requestAnimFrame(updateTime);	
		}
	}

	this.stop = (time=false) => {
		cancelAnimFrame(frameRequest);
		if(time) {
			setTime(time)	
		}
	}

	this.hide = () => {
		cancelAnimFrame(frameRequest);
		wrDOM.text("");
		gapDOM.text("");
		stopwatch.classed("hidden",true)
	}
	this.show = (x,y) => {
		//cancelAnimFrame(frameRequest);
		if(x && y) {
			stopwatch
				.attr("transform",`translate(${x},${y})`)	
		}
		
		stopwatch
			.classed("hidden",false)
	}
	
	this.showDistance = (distance) => {
		if(distance===0) {
			distDOM.text("Reaction time");
			return;
		}
		distDOM.text(distance+"m");
	}

	this.showRecord = (record,gap,split=false) => {

		
		if(split) {
			wrDOM.text(`WR Split ${record}`);
		} else {
			wrDOM.text(`WR ${record}`);
		}
		if(!gap) {
			gapDOM.text("")
			return;	
		}

		//console.log(gap)

		gapDOM.text(`${gap>0?"+":"-"}${formatSecondsMilliseconds(Math.abs(gap))}`);

		wr_visible=true;
	}

	this.hideRecord = () => {
		wr_visible=false;
		wrDOM.text("");
		gapDOM.text("");
	}

	this.isRecordHidden = () => {
		return !wr_visible;
	}

	/*this.append = (entrant,time) => {
		//console.log(entrant);

		list.push({
			entrant:entrant.name,
			time:entrant.time
		});

		list_container.append("li")
			.datum(list[list.length-1])
			.text(d=>{
				return entrant.name;//d.entrant.entrant.participant.competitor.lastName;
			})
			.append("span")
				.attr("class","result")
				.text(d=>{
					return entrant.time;//d.time.value;
				})
	}*/
}
import {
    select,
    selectAll
} from 'd3-selection';
import {
    range
} from 'd3-array';
import {
	transition
} from 'd3-transition';
import {
	interpolateString
} from 'd3-interpolate';
// import {
// 	easeLinear as easeLeg
// } from 'd3-ease';
import {
	line as d3_line,
	curveCardinal
} from 'd3-shape';

import {
	convertTime
} from '../lib/time';
import {
	dimensions,
	dimensions200m,
	ReadyGoEasing,
	RunningLinear
} from '../lib/running'

export default function Runner(data,options) {

	console.log("Runner",data,options)

	let multiplier=options.multiplier || 1;

	if(options.race==="200m") {
		for(var d in dimensions200m) {
			dimensions[d]=dimensions200m[d];
		}
	}

	let box = options.container.getBoundingClientRect();
    let WIDTH = options.width || box.width,
        HEIGHT = options.height || box.height;

    let margins=options.margins;

    let hscale=options.scales.h.range([0,WIDTH-(margins.left+margins.right)]),
    	vscale=options.scales.v.range([0,HEIGHT-(margins.top+margins.bottom)])

	let runner=select(options.container)
					.append("g")
					.attr("class","runner")
					.attr("transform",`translate(${margins.left},${margins.top})`)
	let prev_total=0,
		start_time=0;
	let leg_number=1;
	if(options.race==="400m") {
		leg_number=4;
	}
	if(options.race==="200m") {
		leg_number=2;
	}
	let legs_data=range(leg_number).map(d=>data);

	console.log("LEGS DATA",legs_data)

	

	let leg=runner.selectAll("g.leg")
				.data(legs_data.map((d,i)=>{
					let dd={};

					dd.leg=i;
					dd.total_time= convertTime(d.value)/leg_number*(i+1)
					dd.real_leg_time=dd.total_time - prev_total
					dd.leg_time = dd.real_leg_time - (i===1?start_time:0);
					prev_total=dd.total_time;

					return dd;
				}))
				// .data([data,data,data,data].map((d,i)=>{
				// 	let dd={};

				// 	dd.leg=i;
				// 	dd.total_time= convertTime(d.value)/4*(i+1)
				// 	dd.real_leg_time=dd.total_time - prev_total
				// 	dd.leg_time = dd.real_leg_time - (i===1?start_time:0);
				// 	prev_total=dd.total_time;

				// 	return dd;
				// }))
				// .data([data,data].map((d,i)=>{
				// 	let dd={};

				// 	dd.leg=i;
				// 	dd.total_time= convertTime(d.value)/2*(i+1)
				// 	dd.real_leg_time=dd.total_time - prev_total
				// 	dd.leg_time = dd.real_leg_time - (i===1?start_time:0);
				// 	prev_total=dd.total_time;

				// 	return dd;
				// }))
				
				/*.data([data].map((d,i)=>{
					let dd={};

					dd.leg=i;
					dd.total_time= convertTime(d.value)*(i+1)
					dd.real_leg_time=dd.total_time - prev_total
					dd.leg_time = dd.real_leg_time - (i===1?start_time:0);
					prev_total=dd.total_time;

					return dd;
				}))*/
				.enter()
				.append("g")
					.attr("class","leg")
					.attr("rel",d=>d.leg_time)

	//console.log("DATA",leg.data())

	let line = d3_line().curve(curveCardinal)

	
	leg.append("path")
			.datum((d,i)=>{
				let v;
				//console.log(d,i)
				
				v=[
					[hscale(dimensions.length*i+dimensions.block),vscale(dimensions.man_height)],
					[hscale(dimensions.length*(i+1)+dimensions.block),vscale(dimensions.man_height)]
				];
				
				//console.log(v)
				return v;
			})
			.attr("d",d=>{
				//console.log("..........",d)
				return line(d);
			})

	

	let athlete=runner.append("g")
				.attr("class","athlete")
	athlete.append("circle")
				.attr("cx",0)
				.attr("cy",0)
				.attr("r",4)

	

	let splitResults=leg.data();

	let current=0;
	function run() {
		if(splitResults.length) {
			let leg_time=splitResults.shift();

			legTransition(leg.filter((d,i)=>{
				return i===current;
			}))

		} else {
			if(options.endCallback) {
				options.endCallback();	
			}
		}
	}

	this.run = () => {run()};
	

	function legTransition(leg) {

		////console.log(leg.datum())
		let info=leg.datum();
		//console.log("-->",info)
		let time=info.leg_time;

		if(dimensions.race[options.race]) {
			time=convertTime(dimensions.race[options.race][+data.order-1][info.leg]+"");
		}
		let t=transition()
				.duration((time?time:info.leg_time)/multiplier)
				.ease(info.start?ReadyGoEasing:RunningLinear)

	  	leg.select("path")
	  		.transition(t)
			.attrTween("stroke-dasharray", function(d){
				if(options.ovalCallback) {
					options.ovalCallback(info);
				}
				return tweenDash(this)
			})
			.on("end", (d,i)=>{
				//console.log("end",d)
				
				if(options.callback) {
					options.callback(current);	
				}

				current++;
				run();
				
			});

	}

	function tweenDash(path) {
		return function(t) {

			let l=path.getTotalLength();

			let interpolate = interpolateString("0," + l, l + "," + l);

			let p = path.getPointAtLength(t * l);

            athlete
            	.attr("transform", "translate(" + p.x + "," + p.y + ")")            
            
            

            return interpolate(t);
		}
	}
	


}
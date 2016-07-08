import {
    select,
    selectAll
} from 'd3-selection';
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
	DiveEasing,
	SwimmingEasing,
	SwimmingLinear
} from '../lib/swimming'

export default function Record(data,options) {

	console.log("Record",data,options)

	let multiplier=options.multiplier || 1;

	let box = options.container.getBoundingClientRect();
    let WIDTH = options.width || box.width,
        HEIGHT = options.height || box.height;

    let margins=options.margins;

    let hscale=options.scales.h.range([0,WIDTH-(margins.left+margins.right)]),
    	vscale=options.scales.v.range([0,HEIGHT-(margins.top+margins.bottom)])

	let swimmer=select(options.container)
					.append("g")
					.attr("class","swimmer")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	let prev_total=0,
		start_time;
	let leg=swimmer.selectAll("g.leg")
				.data(([data.resultExtension[0]]).concat(data.resultExtension[1].extension).map((d,i)=>{
					//console.log(d.value,convertTime(d.value))
					
					if(i===0) {
						//d.leg_time = +d.value*1000;
						start_time=convertTime(data.resultExtension[1].extension[0].value)*(15/50)*0.5+convertTime(d.value);
						d.leg_time=start_time;
						d.start=true;
					} else {
						if(i===1) {
							d.linear=true;
						}
						d.total_time= convertTime(d.value)
						d.real_leg_time=d.total_time - prev_total
						d.leg_time = d.real_leg_time - (i===1?start_time:0);
						prev_total=d.total_time;	
					}

					//console.log(d)

					return d;
				}))
				.enter()
				.append("g")
					.attr("class","leg")
					.attr("rel",d=>d.leg_time)


	let line = d3_line().curve(curveCardinal)

	//console.log(curveCardinal(0.5))
	let water_line=dimensions.man_height+dimensions.step;
	leg.append("path")
			.datum((d,i)=>{
				if(i==0) {
					return [
						[hscale(dimensions.block),vscale(dimensions.man_height*3/4)],
						[hscale(dimensions.block+3),vscale(water_line)], //2.8 - 3.5m
						[hscale(dimensions.block+7),vscale(water_line+1.5)],
						[hscale(dimensions.block+11),vscale(water_line+0.5)],
						[hscale(dimensions.block+15),vscale(water_line)]
					]
				}
				if(i==1) {
					return [
						[hscale(dimensions.block+15),vscale(water_line)],
						[hscale(dimensions.block+dimensions.length),vscale(water_line)]
					]
				}
				if(i%2) {
					return [
						[hscale(dimensions.block),vscale(water_line)],
						[hscale(dimensions.block+dimensions.length),vscale(water_line)]
					];
				} else {
					return [
						[hscale(dimensions.length+dimensions.block),vscale(water_line)],
						[hscale(dimensions.block),vscale(water_line)]
					]
				}
			})
			.attr("d",line)
	

	let athlete=swimmer.append("g")
				.attr("class","record")
	athlete.append("line")
				.attr("x1",0)
				.attr("y1",3)
				.attr("x2",0)
				.attr("y2",hscale(dimensions.depth-dimensions.step)-3)

	

	let splitResults=([data.resultExtension[0]]).concat(data.resultExtension[1].extension)

	let current=0;
	function swim() {
		if(splitResults.length) {
			let leg_time=splitResults.shift();

			transition(leg.filter((d,i)=>{
				return i===current;
			}))

		}
	}

	swim();

	function transition(leg) {

		//console.log(leg.datum())
		let info=leg.datum();
		console.log("-->",info)

	  	leg.select("path")
	  		.transition()
			.duration(info.leg_time/multiplier)
			.ease(info.start?DiveEasing:(info.linear?SwimmingLinear:SwimmingEasing))
			.attrTween("stroke-dasharray", function(d){return tweenDash(this)})
			.on("end", (d,i)=>{
				console.log("end",d)
				
				if(options.callback) {
					options.callback(current);	
				}

				current++;
				swim();
				
			});

	}

	function tweenDash(path) {
		return function(t) {

			let l=path.getTotalLength();

			let interpolate = interpolateString("0," + l, l + "," + l);

			let p = path.getPointAtLength(t * l);

            athlete
            	.attr("transform", "translate(" + p.x + "," + vscale(dimensions.man_height+dimensions.step) + ")")            
            
            return interpolate(t);
		}
	}

	

	

}
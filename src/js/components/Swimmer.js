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

export default function Swimmer(data,options) {

	console.log("Swimmer",data,options)

	let multiplier=options.multiplier || 1;

	let box = options.container.getBoundingClientRect();
    let WIDTH = options.width || box.width,
        HEIGHT = options.height || box.height;

    let margins=options.margins;

    let hscale=options.scales.h.range([0,WIDTH-(margins.left+margins.right)]),
    	vscale=options.scales.v.range([0,HEIGHT-(margins.top+margins.bottom)])

    let defs=select(options.container).append("defs")
   	let gradient=defs.append("linearGradient")
   				.attr("id","gradient")
   				.selectAll("stop")
   					.data([
   						{
   							"stop-color":"white",
   							"stop-opacity":1,
   							"offset":"0%"
   						},
   						{
   							"stop-color":"white",
   							"stop-opacity":0,
   							"offset":"100%"
   						}
   					])
   					.enter()
   					.append("stop")
   						.attr("stop-color",d=>d["stop-color"])
   						.attr("stop-opacity",d=>d["stop-opacity"])
   						.attr("offset",d=>d.offset);


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
			.attr("stroke-dasharray",function(d){
				return "0 "+this.getTotalLength();
			})
			.classed("gold",d=>{
				console.log("SWIMMEEEEER",data)
				if(!Array.isArray(data.property)) {
					return false;
				}
				return data.property.find(p=>{
					return p.type=="Medal Awarded" && p.value==="Gold"
				})
			})
			.classed("silver",d=>{
				if(!Array.isArray(data.property)) {
					return false;
				}
				return data.property.find(p=>{
					return p.type=="Medal Awarded" && p.value==="Silver"
				})
			})
			.classed("bronze",d=>{
				if(!Array.isArray(data.property)) {
					return false;
				}
				return data.property.find(p=>{
					return p.type=="Medal Awarded" && p.value==="Bronze"
				})
			})
	

	let athlete=swimmer.append("g")
				.attr("class","athlete")
	/*athlete.append("circle")
				.attr("cx",0)
				.attr("cy",0)
				.attr("r",3)
				.classed("gold",d=>{
					console.log("SWIMMEEEEER",data)
					if(!Array.isArray(data.property)) {
						return false;
					}
					return data.property.find(p=>{
						return p.type=="Medal Awarded" && p.value==="Gold"
					})
				})
				.classed("silver",d=>{
					if(!Array.isArray(data.property)) {
						return false;
					}
					return data.property.find(p=>{
						return p.type=="Medal Awarded" && p.value==="Silver"
					})
				})
				.classed("bronze",d=>{
					if(!Array.isArray(data.property)) {
						return false;
					}
					return data.property.find(p=>{
						return p.type=="Medal Awarded" && p.value==="Bronze"
					})
				})*/

	// let athlete_tail=swimmer.append("g");

	// athlete_tail.append("rect")
	// 			.attr("x",-40)
	// 			.attr("y",vscale(water_line - dimensions.step - dimensions.man_height*1/4)-3)
	// 			.attr("width",40)
	// 			.attr("height",vscale(dimensions.man_height+dimensions.step+1.5))
	// 			.style("fill","red")
	// 			.style("fill-opacity",0.5)
	// 			//.style("fill","url(#gradient)")
	// athlete_tail.append("rect")
	// 			.attr("class","tail")
	// 			.attr("x",-40)
	// 			.attr("y",vscale(water_line - dimensions.step - dimensions.man_height*1/4)-3)
	// 			.attr("width",0)
	// 			.attr("height",vscale(dimensions.man_height+dimensions.step+1.5))
	// 			.style("fill","white")

	

	let splitResults=([data.resultExtension[0]]).concat(data.resultExtension[1].extension)

	let current=0;
	function swim() {
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

	this.swim = () => {
		swim()
	};
	

	function legTransition(leg) {

		//console.log(leg.datum())
		let info=leg.datum();
		console.log("-->",info)

	  	leg.select("path")
	  		.transition()
			.duration(info.leg_time/multiplier)
			.ease(info.start?DiveEasing:(info.linear?SwimmingLinear:SwimmingEasing))
			.attrTween("stroke-dasharray", function(d){return tweenDash(this,current)})
			.on("end", (d,i)=>{
				console.log("end",d,i)
				
				if(options.callback) {
					options.callback(current);	
				}

				if(i>=1) {
					//console.log("HIDE PATH",i)
					swimmer.selectAll("path")
						.filter((d,j)=>j<i+1)
							.attr("stroke-dasharray",function(d){
								return "0 "+this.getTotalLength();
							})
				}

				current++;
				swim();
				
			});

	}

	function tweenDash(path,leg) {
		return function(t) {

			let l=path.getTotalLength();

			let interpolate = interpolateString("0," + l, l + "," + l);
			//console.log('interpolateString("0," + '+l+', '+l+' + "," + '+l+')')

			let p = path.getPointAtLength(t * l);

            athlete
            	.attr("transform", "translate(" + p.x + "," + p.y + ")")

            /*let x,w;
            if(!leg%2 || leg===1) {
            	x=-p.x + hscale(dimensions.block)
            	w=(p.x - 40 - hscale(dimensions.block))
            	
            } else {
            	x=p.x+40;
            	w=40;
            }

            athlete_tail
	            	.attr("transform", "translate(" + p.x + "," + 0 + ")")         
	            	.select(".tail")
	            	.attr("x",x)
	            	.attr("width",w>0?w:0)	*/

            

            return interpolate(t);
		}
	}

	

	

}
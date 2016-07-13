import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear
} from 'd3-scale';
import {
	max as d3_max,
	min as d3_min,
	extent,
	sum as d3_sum
} from 'd3-array';
import {
	nest
} from 'd3-collection';
import {
	format as d3_format
} from 'd3-format';
import {
	line as d3_line,
	curveCardinal
} from 'd3-shape';
import {
	transition
} from 'd3-transition';
import {
	interpolateString
} from 'd3-interpolate';
//import Barchart from './Barchart';


import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	convertTime,
	formatSecondsMilliseconds,
	getDistance
} from '../lib/time';

import {
	dimensions,
	DiveEasing,
	SwimmingLinear
} from '../lib/swimming'

//import Velodrome from './Velodrome';

export default function SwimmingExploded(data,options) {

	console.log("SwimmingExploded",data.olympics.eventUnit.result.entrant);

	let swimmers_data=[],
		best_cumulative_times={},
		CURRENT_LEG=0;

	let frameRequest = requestAnimFrame(function checkInnerHTML(time) {
        ////console.log(time)
        
        if(options.container && options.container.getBoundingClientRect().height) {
            cancelAnimFrame(checkInnerHTML);
           	
			buildEvent();

            return; 
        }
        frameRequest = requestAnimFrame(checkInnerHTML);
    });

    function buildEvent() {
    	
    	let REACTION_TIME=0,
    		SPLITS=1;

    	swimmers_data=data.olympics.eventUnit.result.entrant.sort((a,b)=>(+a.order - +b.order)).map(entrant => {
    		let prev_cumulative_time=0;
    		return {
    			"swimmer":entrant.participant.competitor.fullName,
    			"reaction_time":{
    				value:entrant.resultExtension[REACTION_TIME].value,
    				time: +entrant.resultExtension[REACTION_TIME].value * 1000
    			},
    			"splits":entrant.resultExtension[SPLITS].extension.map((d,i)=>{
    				let cumulative_time=convertTime(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;
    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position*50
    					//cumulative_time:distance==best_cumulative_time:x
    				}
    			}),
    			"entrant":entrant,
    			"value":entrant.value
    		}
    	});

    	

    	swimmers_data.forEach(swimmer=>{
    		if(!best_cumulative_times[0]) {
				best_cumulative_times[0]={
					cumulative_times:[],
    				times:[]
				}
			}
			best_cumulative_times[0].times.push(swimmer.reaction_time.time)
			best_cumulative_times[0].cumulative_times.push(swimmer.reaction_time.time)

    		swimmer.splits.forEach(split=>{
    			if(!best_cumulative_times[split.distance]) {
    				best_cumulative_times[split.distance]={
    					cumulative_times:[],
    					times:[]
    				}
    			}
    			best_cumulative_times[split.distance].times.push(split.time)
    			best_cumulative_times[split.distance].cumulative_times.push(split.cumulative_time)
    		})
    	})
    	for(let distance in best_cumulative_times) {
    		best_cumulative_times[distance].best_time=d3_min(best_cumulative_times[distance].times);
    		best_cumulative_times[distance].best_cumulative=d3_min(best_cumulative_times[distance].cumulative_times);
    		best_cumulative_times[distance].times=best_cumulative_times[distance].times.sort((a,b)=>(a-b));
    		best_cumulative_times[distance].times=best_cumulative_times[distance].cumulative_times.sort((a,b)=>(a-b));
    	}
    	console.log(swimmers_data)
		console.log(best_cumulative_times)
		buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","swimming-exploded")

	    
	    let ul=container.append("div")
	    				.attr("class","swimmers")
	    				.append("ul");
	    let header=ul.append("li")
	    				.attr("class","header");
	    // header.append("div")
	    // 			.attr("class","swimmer-name")
	    // 			.html("&nbsp;")
	    
	    header.append("div")
	    			.attr("class","splits")
	    			.selectAll("div.split")
	    			.data([0,50,100,150,200])
	    			.enter()
	    			.append("div")
	    				.attr("class","split")
	    				.classed("start-leg",d=>(d===0))
	    				.html(d=>{
	    					if(d===0) {
	    						return "&nbsp;";//"Start"
	    					}
	    					return d+"m";
	    				})


	    let swimmer=ul
						.selectAll("li.swimmer")
						.data(swimmers_data)
						.enter()
							.append("li")
							.attr("class","swimmer")

	    let name_box=swimmer.append("div")
	    				.attr("class","swimmer-name")
	    name_box
				.append("span")
				.text(d=>d.swimmer)

		let svg=swimmer
					.append("div")
					.attr("class","splits")
						.selectAll("div.split")
								.data(d=>{
									console.log(d)
									return ([{
										value:d.reaction_time.value,
										time:d.reaction_time.time,
										cumulative_time:d.reaction_time.time,
										distance:0
									}]).concat(d.splits)
								})
								.enter()
								.append("div")
									.attr("class","split")
			    						.append("svg")
	    let defs=svg.append("defs");
	    svg
			.each(function(d){

				let box = this.getBoundingClientRect();
			    let WIDTH = options.width || box.width,
			        HEIGHT = options.height || box.height;

			    //console.log(WIDTH,HEIGHT)
			    let hscale=scaleLinear().domain([0,dimensions.length+dimensions.block*4]).range([0,WIDTH-(margins.left+margins.right)]),
					vscale=scaleLinear().domain([0,dimensions.step+dimensions.depth+dimensions.man_height]).range([0,HEIGHT-(margins.top+margins.bottom)]);

				d.swimmer=new Swimmer(d,{
						svg:select(this),
						container:this.parentNode,
						margins:margins,
						hscale:hscale,
						vscale:vscale,
						best_times:best_cumulative_times,
						endCallback:(s) => {
							//updateNames(split)
							updateTimes(s);
						}
				});
				new SwimmingPool({
						svg:select(this),
						container:this.parentNode,
						margins:margins,
						hscale:hscale,
						vscale:vscale,
						distance:d.distance
				})
			})


		defs.append("linearGradient")
				.attr("id","poolEndBorder")
				.selectAll("stop")
					.data([
						{
							"offset":"80%",
							"class":"water-color",
							"stop-opacity":0
						},
						{
							"offset":"100%",
							"class":"water-color",
							"stop-opacity":0.5
						}
					])
					.enter()
					.append("stop")
						.attr("class",d=>d["class"])
						.attr("offset",d=>d.offset)
						.attr("stop-opacity",d=>d["stop-opacity"]);

		defs.append("linearGradient")
				.attr("id","poolStartBorder")
				.selectAll("stop")
					.data([
						{
							"offset":"0%",
							"class":"water-color",
							"stop-opacity":0.5
						},
						{
							"offset":"20%",
							"class":"water-color",
							"stop-opacity":0
						}
					])
					.enter()
					.append("stop")
						.attr("class",d=>d["class"])
						.attr("offset",d=>d.offset)
						.attr("stop-opacity",d=>d["stop-opacity"])
		
		
	    let time_box=swimmer.append("div")
	    				.attr("class","swimmer-performances")
	    				/*.append("ul")
	    					.selectAll("li")
	    					.data(swimmers_data)
	    					.enter()
	    						.append("li");*/
	    time_box
			.append("span")
			.text(d=>{
				return d.value;
			})
		time_box
			.append("i")
			.text(d=>{
				let last_split=d.splits[d.splits.length-1],
					diff=last_split.cumulative_time - best_cumulative_times[last_split.distance].best_cumulative,
					_time="";
				if(diff>0) {
		    		_time="+"+formatSecondsMilliseconds(diff);
		    	}
				return _time;
			})
		/*time_box
			.append("ol")
				.selectAll("li")
				.data(d=>{
					console.log(d)
					return ([{
						value:d.reaction_time.value,
						time:d.reaction_time.time,
						cumulative_time:d.reaction_time.time,
						distance:0
					}]).concat(d.splits)
				})
					.enter()
					.append("li")
					.classed("gold",d=>{
						return best_cumulative_times[d.distance].cumulative_times.indexOf(d.cumulative_time)===0;
					})
					.classed("silver",d=>{
						return best_cumulative_times[d.distance].cumulative_times.indexOf(d.cumulative_time)===1;
					})
					.classed("bronze",d=>{
						return best_cumulative_times[d.distance].cumulative_times.indexOf(d.cumulative_time)===2;
					})
					.text(d=>{
						return best_cumulative_times[d.distance].cumulative_times.indexOf(d.cumulative_time)+1;
					})
					.on("click",(d)=>{
						swimmers_data.forEach(s => {
			    			s.swimmer.showLeg(d.distance)
			    		})
					})*/


	    function updateTimes(s) {
	    	console.log("updateTimes",s)
	    	time_box.select("span")
	    			.text(d=>{
	    				//console.log(s)
	    				if(s.distance===0) {
	    					return d.reaction_time.value;
	    				}
	    				let split=d.splits.find(sp=>(sp.distance===s.distance));
	    				return split.value;
	    			})
	    }
	}
}
function Swimmer(data,options) {
	console.log("Swimmer",data,options);

	let box = options.container.getBoundingClientRect();
	    let WIDTH = box.width,
	        HEIGHT = box.height;

	let line = d3_line().curve(curveCardinal)

	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	let hscale=options.hscale,
		vscale=options.vscale;

	let delta_x=(data.distance > 0)?(hscale(dimensions.length+dimensions.block)-WIDTH+margins.right+2):0
	
   	let swimmer=options.svg
				.append("g")
				.attr("class","swimmer")
				.attr("transform",`translate(${margins.left - (delta_x)},${margins.top})`)
				//.attr("transform",`translate(${margins.left},${margins.top})`)

	let water_line=dimensions.man_height+dimensions.step;
	let leg=swimmer
				/*.selectAll("g.leg")
						.data(([{
							value:data.reaction_time.value,
	    					time:data.reaction_time.time,
	    					cumulative_time:data.reaction_time.time,
	    					distance:0
						}]).concat(data.splits))
						.enter()*/
						.append("g")
							.attr("rel",d=>("m"+d.distance))
							.attr("class",d=>("leg m"+d.distance))
							.datum(data)
	leg
		.append("path")
			.attr("d",d=>{

				//cumulative_time:distance==best_cumulative_time:x
				//x=distance*best_cumulative_time/cumulative_time
				
				let distance=d.distance || 3.5;
				d.mt=distance*options.best_times[d.distance].best_cumulative/d.cumulative_time;
				d.dmt=distance-d.mt;
				console.log(d)

				if(d.distance==0) {
					return line([
							[hscale(dimensions.block),vscale(dimensions.man_height*3/4)],
							[hscale(dimensions.block+d.mt/2),vscale(dimensions.man_height*4/5)],
							[hscale(dimensions.block+d.mt),vscale(water_line)]
						])
				}

				// if(d.distance%100>0) {
				// 	//go
				// 	return line([
				// 			[hscale(dimensions.block),vscale(water_line)],
				// 			[hscale(dimensions.block+dimensions.length-d.dmt),vscale(water_line)]
				// 		]);
				// } else {
				// 	//back
				// 	return line([
				// 				[hscale(dimensions.length+dimensions.block),vscale(water_line)],
				// 				[hscale(dimensions.block+d.dmt),vscale(water_line)]
				// 			]);
				// }
				return line([
							[hscale(dimensions.block),vscale(water_line)],
							[hscale(dimensions.block+dimensions.length-d.dmt),vscale(water_line)]
						]);
				
			})
			.classed("gold",d=>{
				return options.best_times[d.distance].cumulative_times.indexOf(d.cumulative_time)===0;
			})
			.classed("silver",d=>{
				return options.best_times[d.distance].cumulative_times.indexOf(d.cumulative_time)===1;
			})
			.classed("bronze",d=>{
				return options.best_times[d.distance].cumulative_times.indexOf(d.cumulative_time)===2;
			})
			

	this.showLeg = (mt) => {
		leg
			.classed("visible",(d)=>{
				return d.distance == mt;
			})
			.filter(d=>{
				return d.distance == mt;	
			})
			.each(function(d){
				//console.log(d,this)
				legTransition(this,d)
			})
	}

	function legTransition(leg,split) {

		console.log(leg,split)

		let __TIME=1000;//(time?time:info.leg_time)/multiplier;
	  	select(leg)
	  		.select("path")
	  			.attr("stroke-dasharray",function(d){
					return "0 "+this.getTotalLength();
				})
		  		.transition()
				.duration(options.best_times[split.distance].best_time/(split.distance===0?1:20))
				//.ease(!split?CyclingEasing:CyclingLinear)
				//.ease(SwimmingLinear)
				//.ease(RunningLinear)
				//.ease(info.leg===0?Running200mEasing:RunningLinear)
				.attrTween("stroke-dasharray", function(d){return tweenDash(this,d)})
				.on("end", function(d,i) {
					console.log("end",d,i)
					
					if(options.endCallback) {
						options.endCallback(d)
					}

					// if(CURRENT[index]===split) {
					// 	CURRENT[index]++;
					// 	PREV[index]=this;

					// 	if(options.splitCallback) {
					// 		//console.log("SPLIT CALLBACK",index,CURRENT[index],split)
					// 		options.splitCallback(index,split)
					// 	}

					// 	teamTransition(index,CURRENT[index]);
					// }
					
				});
	}

	function tweenDash(path,split) {
		if(split.distance===0) {
			return function(t) {
				let l=path.getTotalLength();
				let interpolate = interpolateString("0," + l, l + "," + l);
	            return interpolate(t);
			}
		}
		return function(t) {

			

			let part = 0.7,
				totalLength=path.getTotalLength(),
				snakeLength = hscale(2),//totalLength * 0.08,
    			gap = totalLength - snakeLength,
    			position=totalLength*part + (totalLength*(1-part))*(t);

			let dash;//"0,"+(position)+","+snakeLength+","+totalLength;

			if(position<snakeLength) {
				let interpolate=interpolateString("0," + totalLength, totalLength + "," + totalLength)
				dash=interpolate(t);
				console.log("1",t,dash) //initial part shorter than swimmer
			} 
			// else if (position>=gap) {
			// 	dash="0,"+(position - snakeLength)+","+snakeLength+","+totalLength;
			// 	console.log("2",t,dash)
			// } 
			else {
				dash="0,"+(position - snakeLength)+","+snakeLength+","+totalLength;
				console.log("3",t,dash) //part in middle
			}
			
			//console.log(t,"---->",dash)
            //console.log(dash)
            return dash;
            // return interpolate(t);

            // return interpolate(t);
		}
	}

}
function SwimmingPool(options) {

		console.log("SwimmingPool",options)

		let box = options.container.getBoundingClientRect();
	    let WIDTH = box.width,
	        HEIGHT = box.height;

		//return;
		let hscale=options.hscale,
			vscale=options.vscale;

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

		let delta_x=(options.distance>0)?(hscale(dimensions.length+dimensions.block)-WIDTH+margins.right+2):0
		
	   	let pool=options.svg
					.append("g")
					.attr("class","swimming-pool")
					.attr("transform",`translate(${margins.left - (delta_x)},${margins.top})`)

		pool
			.append("g")
				.attr("class","water")
					.append("rect")
						.attr("x",hscale(dimensions.block))
						.attr("y",vscale(dimensions.step+dimensions.man_height))
						.attr("width",hscale(dimensions.length))
						.attr("height",vscale(dimensions.depth))
						.style("fill",`url(#${options.distance===0?"poolStartBorder":"poolEndBorder"})`)

		if(options.distance===0) {



			pool.append("path")
			.attr("class","pool-line")
			.attr("d",()=>{
				return `M${hscale(0)},${vscale(dimensions.man_height)}
						
						l${hscale(dimensions.block)},0 
						
						l0,${vscale(dimensions.step)} 

						l0,${vscale(dimensions.depth)} 

						l${hscale(dimensions.length)},0 

						l0,${-vscale(dimensions.depth)} 

						l0,${-vscale(dimensions.step)} `

						//l${hscale(dimensions.block)},0 ` 
			});
		} else {
			pool.append("path")
				.attr("class","pool-line")
				.attr("d",()=>{
					return `M${hscale(0)+hscale(dimensions.block)},${vscale(dimensions.man_height)}
							
							l0,${vscale(dimensions.step)} 

							l0,${vscale(dimensions.depth)} 

							l${hscale(dimensions.length)},0 

							l0,${-vscale(dimensions.depth)} 

							l0,${-vscale(dimensions.step)} `

							//l${hscale(dimensions.block)},0 ` 
				});
		}

		
		
}
function Timeline(options) {

	let timeline=options.container
					.append("div")
						.attr("class","timeline");

	let step=timeline.selectAll("div.step")
						.data(options.steps)
						.enter()
						.append("div")
							.attr("class","step")
							.on("click",(d)=>{
								if(options.clickCallback) {
									options.clickCallback(d)
								}
							})
	step.append("span")
			.attr("class","dot");
	step.append("b")
			.text(d=>{
				return d+"mt"
			})

}
import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear,
	scalePoint
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
import {
	axisBottom
} from 'd3-axis';
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

export default function SwimmingLineChart(data,options) {

	console.log("SwimmingLineChart",data.olympics.eventUnit.result.entrant);

	let swimmers_data=[],
		best_cumulative_times={},
		CURRENT_LEG=0,
		WR;

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

    	//swimmers_data=data.olympics.eventUnit.result.entrant.sort((a,b)=>(+a.order - +b.order)).map(entrant => {
    	swimmers_data=data.olympics.eventUnit.result.entrant.map(entrant => {
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

    	WR={
    	    		"swimmer":"WR",
    	    		"value":"1:54.00",
    				"reaction_time":{
    					value:"0.66",
    					time: 660
    				},
    				"splits":{
    					0:{
    						value:"0.66",
    						time:660,
    						cumulative_time:660,
    						distance:0*50
    					},
    					50:{
    						value:"28.5",
    						time:28500,
    						cumulative_time:28500*1,
    						distance:1*50
    					},
    					100:{
    						value:"57.0",
    						time:28500,
    						cumulative_time:28500*2,
    						distance:2*50
    					},
    					150:{
    						value:"1:25.5",
    						time:28500,
    						cumulative_time:28500*3,
    						distance:3*50
    					},
    					200:{
    						value:"1:54.00",
    						time:28500,
    						cumulative_time:28500*4,
    						distance:4*50
    					}
    				},
    				"entrant":{
    					participant: {
    						competitor: {
    							lastName: "WR"
    						}
    					}
    				}
    	    	};

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
	    					.attr("class","gap-linechart")

	    let box = container.node().getBoundingClientRect();
	    let WIDTH = box.width,
	        HEIGHT = box.height;
	    
	    let line = d3_line().curve(curveCardinal)

		let xscale=scalePoint().domain([0,50,100,150,200]).range([0,WIDTH-(margins.left+margins.right)]),
			yscale=scaleLinear().domain([0,5*1000*1.1]).range([0,HEIGHT-(margins.top+margins.bottom)]);
		
		let svg=container.append("svg")

		let axes=svg
					.append("g")
					.attr("class","axes")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	   	let lines=svg
					.append("g")
					.attr("class","lines")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		let athlete=lines
					.selectAll("g.athlete")
					.data(swimmers_data)
					.enter()
					.append("g")
						.attr("class","athlete")
						.classed("gold",d=>{
							let t=d.splits[d.splits.length-1];
							return best_cumulative_times[t.distance].cumulative_times.indexOf(t.cumulative_time)===0;
						})
						.classed("silver",d=>{
							let t=d.splits[d.splits.length-1];
							return best_cumulative_times[t.distance].cumulative_times.indexOf(t.cumulative_time)===1;
						})
						.classed("bronze",d=>{
							let t=d.splits[d.splits.length-1];
							return best_cumulative_times[t.distance].cumulative_times.indexOf(t.cumulative_time)===2;
						})

		athlete.append("path")
				.attr("d",d=>{
					console.log(d)
					let splits=([{
										value:d.reaction_time.value,
										time:d.reaction_time.time,
										cumulative_time:d.reaction_time.time,
										distance:0
									}]).concat(d.splits);

					return line(splits.map(s=>{

						d.diff=s.cumulative_time - best_cumulative_times[s.distance].best_cumulative;

						

						/*d.diff_wr=s.cumulative_time - WR.splits[s.distance].cumulative_time;

						if(d.swimmer==="Markus Deibler") {
							console.log("DIFF WR",s.cumulative_time,WR.splits[s.distance].cumulative_time,d.diff_wr)	
						}*/
						

						return [xscale(s.distance),
								yscale(d.diff)
						]
					}))
				})
		let prev_marker=-1000;
		let marker=athlete.append("g")
								.attr("class","marker")
								.attr("transform",(d,i)=>{
									let x=xscale.range()[1]+10,
										y=yscale(d.diff)+5,
										delta=y-prev_marker;

									console.log(d.swimmer,y,delta,prev_marker)

									if(delta<15) {
										y=y+15
									}
									prev_marker=y;
									return `translate(${x},${y})`;
								});
		marker.append("text")
				.text((d,i)=>{
					return d.entrant.participant.competitor.lastName;
				})
				.append("tspan")
					.attr("dx",5)
					.text(d=>{
						let last_split=d.splits[d.splits.length-1],
							diff=last_split.cumulative_time - best_cumulative_times[last_split.distance].best_cumulative,
							_time=last_split.value;
						if(diff>0) {
				    		_time="+"+formatSecondsMilliseconds(diff);
				    	}
						return _time;
					})

		let xAxis=axisBottom(xscale)
						.tickFormat(d=>{
							if(d===0) {
								return "Reaction time";
							}
							return d+"m."
						})

		let xaxis=axes.append("g")
				.attr("class","x axis")
				.attr("transform",`translate(0,${yscale.range()[1]})`)
				.call(xAxis)

		xaxis.selectAll(".tick")
				.select("text")
					.attr("dx",4)

		xaxis.selectAll(".tick")
				.select("line")
					.attr("y1",-yscale.range()[1])
					.attr("y2",18)

	}



}

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
	sum as d3_sum,
	range
} from 'd3-array';
import {
	nest
} from 'd3-collection';
import {
	format as d3_format
} from 'd3-format';
import {
	line as d3_line,
	curveCardinal,
	curveMonotoneX
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
import {
	interval
} from 'd3-timer';
//import Barchart from './Barchart';
import PerspT from 'perspective-transform';


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

	//console.log("SwimmingLineChart",data.olympics.eventUnit.result.entrant);

	let swimmers_data=[],
		best_cumulative_times={},
		CURRENT_LEG=0,
		LEGS=[],
		WR;

	let athlete,
		marker,
		xscale,
		yscale,
		line = d3_line();//.curve(curveMonotoneX)

	let frameRequest = requestAnimFrame(function checkInnerHTML(time) {
        //////console.log(time)
        
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

    	LEGS=range(swimmers_data[0].splits.length+1).map(d=>d*50);
    	

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
    	//console.log(swimmers_data)
		//console.log(best_cumulative_times)
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
	    
	    

	    let time_extent=extent(LEGS.map(l=>{
	    	let leg_extent=extent(best_cumulative_times[l].cumulative_times);
	    	return leg_extent[1]-leg_extent[0];
	    }))

	    //console.log("TIME_EXTENT",time_extent)
	    

		xscale=scalePoint().domain(LEGS).range([0,WIDTH-(margins.left+margins.right)]);
		yscale=scaleLinear().domain([0,time_extent[1]*1.1]).range([0,HEIGHT-(margins.top+margins.bottom)]);
		
		let svg=container.append("svg")



		var srcCorners = [
						0, 0, 
						WIDTH, 0, 
						0, HEIGHT, 
						WIDTH, HEIGHT
					];
		var dstCorners = [
						WIDTH*0.3, 0,
						WIDTH*0.7, 0, 
						0, HEIGHT, 
						WIDTH, HEIGHT
					];
		var perspT = PerspT(srcCorners, dstCorners);
		var srcPt = [250, 120];
		var dstPt = perspT.transform(srcPt[0], srcPt[1]);

		let pool=svg.append("g")
						.attr("class","pool");
		pool
			.append("path")
				.attr("d",()=>{
					let points=[
						[0,0],
						[WIDTH,0],
						[WIDTH,HEIGHT],
						[0,HEIGHT]
					];
					return line(points.map(p=>{
						console.log(p,perspT.transform(p[0],p[1]))
						return perspT.transform(p[0],p[1])
					}))
				})
				.style("fill","#eee")
		let lanes=range(9).map(d=>{
					let step=WIDTH/8;
					return [[step*d,0],[step*d,HEIGHT]]
				});
		console.log("LANES",lanes)
		pool.selectAll("path.border")
				.data(lanes)
				.enter()
				.append("path")
					.attr("class","border")
					.style("stroke","#333")
					.style("fill","none")
					.attr("d",d=>{
						console.log("b",d)
						return line(d.map(p=>{
							//console.log("border",p)
							return perspT.transform(p[0],p[1])
						}))
					})


		return;

		let axes=svg
					.append("g")
					.attr("class","axes")
					.attr("transform",`translate(${margins.left},${margins.top})`)

	   	let lines=svg
					.append("g")
					.attr("class","lines")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		athlete=lines
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
					//console.log(d)
					d.splits=([{
										value:d.reaction_time.value,
										time:d.reaction_time.time,
										cumulative_time:d.reaction_time.time,
										distance:0
									}]).concat(d.splits);
					let splits=d.splits;
					return line(splits.map(s=>{

						s.diff=s.cumulative_time - best_cumulative_times[s.distance].best_cumulative;

						

						/*d.diff_wr=s.cumulative_time - WR.splits[s.distance].cumulative_time;

						if(d.swimmer==="Markus Deibler") {
							//console.log("DIFF WR",s.cumulative_time,WR.splits[s.distance].cumulative_time,d.diff_wr)	
						}*/
						

						return [xscale(s.distance),
								yscale(s.diff)
						]
					}))
				})
		let prev_marker=-1000;
		marker=athlete.append("g")
							.attr("class","marker")
							.attr("transform",(d,i)=>{
								let x=xscale.range()[1]+5,
									leg=d.splits.find(s=>s.distance===LEGS[LEGS.length-1]),
									y=yscale(leg.diff)+5,
									delta=y-prev_marker;

								//console.log(d.swimmer,y,delta,prev_marker)

								if(delta<15) {
									y=prev_marker+15
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
								return "Start";//"Reaction time";
							}
							return d+(d===LEGS[LEGS.length-1]?"m.":"")
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

		
		//goTo(200)
		start();
	}

	this.goTo = (distance) => {
		goTo(distance);
	}
	this.start = () => {
		start();
	}
	function start() {
		let t=interval((elapsed)=>{
			goTo(CURRENT_LEG);
			//console.log(CURRENT_LEG)
			CURRENT_LEG+=50;
			if(CURRENT_LEG>LEGS[LEGS.length-1]) {
				t.stop();
			}
		},1000)
	}

	function goTo(distance) {
		//console.log("goTo",distance)
		athlete
			.select("path")
					.attr("d",d=>{
						//console.log(d)
						// let splits=([{
						// 	value:d.reaction_time.value,
						// 	time:d.reaction_time.time,
						// 	cumulative_time:d.reaction_time.time,
						// 	distance:0
						// }]).concat(d.splits);

						let splits=d.splits.filter(s=>{
							return s.distance <= distance;
						})

						return line(splits.map(s=>{
							s.diff=s.cumulative_time - best_cumulative_times[s.distance].best_cumulative;	
							return [xscale(s.distance),
									yscale(s.diff)
							]
						}))
					})
		let prev_marker=-1000;
		athlete
			.sort((a,b)=>{

				//console.log(a.splits)
				
				let legs=[
					a.splits.find(s=>s.distance===(distance>0?distance-50:0)),
					b.splits.find(s=>s.distance===(distance>0?distance-50:0))
				];
				return legs[0].diff - legs[1].diff
			})
			.select("g.marker")
				.attr("transform",(d,i)=>{
					let x=xscale(distance)+5,
						leg=d.splits.find(s=>s.distance===(distance>0?distance-50:0)),
						y=yscale(leg.diff)+5,
						delta=y-prev_marker;

					//console.log("->",d.swimmer,d,leg)

					if(delta<15) {
						y=prev_marker+15
					}
					prev_marker=y;
					return `translate(${x},${y})`;
				})
				.select("tspan")
					.text(d=>{
						let leg=d.splits.find(s=>s.distance===distance),
							diff=leg.diff,
							_time=leg.value;
						if(diff>0) {
				    		_time="+"+formatSecondsMilliseconds(diff);
				    	}
						return _time;
					})

		prev_marker=-1000;
		athlete
			.sort((a,b)=>{

				//console.log(a.splits)

				let legs=[
					a.splits.find(s=>s.distance===distance),
					b.splits.find(s=>s.distance===distance)
				];
				return legs[0].diff - legs[1].diff
			})
			.select("g.marker")
				.transition()
				.duration(500)
					.attr("transform",(d,i)=>{

						let x=xscale(distance)+5,
							leg=d.splits.find(s=>s.distance===distance),
							y=yscale(leg.diff)+5,
							delta=y-prev_marker;

						//console.log("->",d.swimmer,d,leg)

						if(delta<15) {
							y=prev_marker+15
						}
						prev_marker=y;
						return `translate(${x},${y})`;
					})
						

	}



}

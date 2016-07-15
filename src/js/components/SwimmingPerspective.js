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
    			"lane":+entrant.order,
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
    	console.log(swimmers_data)
		console.log(best_cumulative_times)
		buildVisual();

	}
	function buildVisual() {

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","swimming-perspective")

	    let box = container.node().getBoundingClientRect();
	    let WIDTH = box.width,
	        HEIGHT = box.height;
	    
	    

	    let time_extent=extent(LEGS.map(l=>{
	    	let leg_extent=extent(best_cumulative_times[l].cumulative_times);
	    	return leg_extent[1]-leg_extent[0];
	    }))

	    //console.log("TIME_EXTENT",time_extent)
	    

		xscale=scaleLinear().domain([0,(dimensions.lanes_n+1)*dimensions.lane]).range([0,WIDTH-(margins.left+margins.right)]);
		yscale=scaleLinear().domain([0,dimensions.length]).range([HEIGHT-(margins.top+margins.bottom),0]);
		
		let svg=container.append("svg")

		let pool={
			w:xscale(dimensions.lane*(dimensions.lanes_n+1)),
			h:yscale(0)
		};

		let srcCorners = [
						0, 0, 
						pool.w, 0,
						pool.w, pool.h,
						0, pool.h
					];
		let dstCorners = [
						pool.w*0.3, 0,
						pool.w*0.7, 0, 
						pool.w, pool.h,
						0, pool.h
					];

		
		// dstCorners = [
		// 				0, 0, 
		// 				xscale.range()[1], 0, 
		// 				0, yscale.range()[1], 
		// 				xscale.range()[1], yscale.range()[1]
		// 			];

		//console.log(srcCorners,dstCorners)

		let perspT = PerspT(srcCorners, dstCorners);

		//return;

		new SwimmingPool({
				svg:svg,
				margins:margins,
				hscale:xscale,
				vscale:yscale,
				perspT:perspT
		})

	   	let lines=svg
					.append("g")
					.attr("class","swimmers")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		let swimmer=lines
					.selectAll("g.swimmer")
					.data(swimmers_data)
					.enter()
					.append("g")
						.attr("class","swimmer")
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

		let leg=swimmer
					.selectAll("g.leg")
					.data(ath=>{

						//console.log("SWIMMER",ath,best_cumulative_times)

						

						return ath.splits.map(d=>{

							let distance=d.distance || 3.5;
							d.mt=distance*best_cumulative_times[d.distance].best_cumulative/d.cumulative_time;
							d.dmt=distance-d.mt;
							d.lane=ath.lane;

							return d;
						});
					})
					.enter()
					.append("g")
						.attr("class",d=>("leg m"+d.distance));

		leg.append("path")
				.attr("d",s=>{

					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length),
						dist=s.distance-s.mt,
						y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length-dist):yscale(dist),
						w=xscale(0.8)

					return line([
								perspT.transform(x-w/2,start_y),
								perspT.transform(x+w/2,start_y),
								perspT.transform(x+w/2,start_y),
								perspT.transform(x-w/2,start_y),
								perspT.transform(x-w/2,start_y)
							]);

					/*return line(splits.map(s=>{

						s.diff=s.cumulative_time - best_cumulative_times[s.distance].best_cumulative;

						return [xscale(s.distance),
								yscale(s.diff)
						]
					}))*/
				})
				.transition()
				.duration(best_cumulative_times[200].best_time/2)
				.ease(SwimmingLinear)
				.attr("d",s=>{

					let x=xscale(s.lane*dimensions.lane + dimensions.lane/2),
						start_y=(s.distance%(dimensions.length*2)>0)?yscale(0):yscale(dimensions.length),
						dist=s.distance-s.mt,
						y=(s.distance%(dimensions.length*2)>0)?yscale(dimensions.length-dist):yscale(dist),
						w=xscale(0.8)

					return line([
								perspT.transform(x-w/2,start_y),
								perspT.transform(x+w/2,start_y),
								perspT.transform(x+w/2,y),
								perspT.transform(x-w/2,y),
								perspT.transform(x-w/2,start_y)
							]);

					/*return line(splits.map(s=>{

						s.diff=s.cumulative_time - best_cumulative_times[s.distance].best_cumulative;

						return [xscale(s.distance),
								yscale(s.diff)
						]
					}))*/
				})

		return;
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

		/*let xAxis=axisBottom(xscale)
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
					.attr("y2",18)*/

		
		//goTo(200)
		//start();
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
function SwimmingPool(options) {

		////console.log("SwimmingPool",options)

		let hscale=options.hscale,
			vscale=options.vscale,
			perspT=options.perspT;

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	   	let pool=options.svg
					.append("g")
					.attr("class","swimming-pool")
					.attr("transform",`translate(${margins.left},${margins.top})`)
		

		let pool_coords=[]


		pool
			.append("g")
				.attr("class","water")
					.append("path")
						.attr("d",()=>{
							let points=[
								[hscale(0),vscale(0)],
								[hscale(dimensions.lane*(dimensions.lanes_n+1)),vscale(0)],
								[hscale(dimensions.lane*(dimensions.lanes_n+1)),vscale(dimensions.length)],
								[hscale(0),vscale(dimensions.length)]
							];
							return d3_line()(points.map(p=>{
								//console.log(p,perspT.transform(p[0],p[1]))
								return perspT.transform(p[0],p[1])
							}))
						})

		let lanes=[
				{
					lanes:range(dimensions.lanes_n).map(d=>{
							return [[hscale(dimensions.lane*(d+1)),vscale.range()[0]],[hscale(dimensions.lane*(d+1)),vscale(5)]]
					}),
					colors:range(dimensions.lanes_n).map(d=>"r")

				},
				{
					lanes:range(dimensions.lanes_n).map(d=>{
							return [[hscale(dimensions.lane*(d+1)),vscale(dimensions.length-5)],[hscale(dimensions.lane*(d+1)),vscale(dimensions.length)]]
					}),
					colors:range(dimensions.lanes_n).map(d=>"r")
				},
				{
					lanes:range(dimensions.lanes_n).map(d=>{
						return [[hscale(dimensions.lane*(d+1)),vscale(dimensions.length-5)],[hscale(dimensions.lane*(d+1)),vscale(5)]]
					}),
					colors:["g","b","b","y","y","y","b","b","g"]
				}
				
		];
		console.log("LANES",lanes)
		pool
			.selectAll("path.lane-ropes")
			.data(lanes)
			.enter()
				.append("g")
					.attr("class","lane-ropes")
					.selectAll("path.lane-rope")
						.data(d=>{ 
							return d.lanes.map((l,i)=>{
								//console.log("L",l,i,d)
								return	{
											rope:l,
											color:d.colors[i]	
										}
								});
						})
						.enter()
						.append("path")
							.attr("class",d=>("lane-rope "+d.color))
							.style("fill","none")
							.attr("d",d=>{
								//console.log("rope",d.rope)
								return d3_line()(d.rope.map(p=>{
									return perspT.transform(p[0],p[1])
								}))
							})
		
}

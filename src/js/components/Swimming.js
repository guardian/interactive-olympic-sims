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

export default function Swimming(data,options) {

	console.log("Swimming",data.olympics.eventUnit.result.entrant);

	let swimmers=[],
		best_cumulative_times={};

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

    	swimmers=data.olympics.eventUnit.result.entrant.sort((a,b)=>(+a.order - +b.order)).map(entrant => {
    		let prev_cumulative_time=0;
    		return {
    			"swimmer":entrant.participant.competitor.fullName,
    			"reaction_time":{
    				value:entrant.resultExtension[REACTION_TIME].value
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

    	

    	swimmers.forEach(swimmer=>{
    		swimmer.splits.forEach(split=>{
    			if(!best_cumulative_times[split.distance]) {
    				best_cumulative_times[split.distance]={
    					times:[]
    				}
    			}
    			best_cumulative_times[split.distance].times.push(split.cumulative_time)
    		})
    	})
    	for(let distance in best_cumulative_times) {
    		best_cumulative_times[distance].best=d3_min(best_cumulative_times[distance].times)
    	}
    	console.log(swimmers)
		console.log(best_cumulative_times)
		buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","swimming")

	    let names=container.append("div")
	    				.attr("class","info swimmer-names")
	    				.append("ul")
	    					.selectAll("li")
	    					.data(swimmers)
	    					.enter()
	    						.append("li")
	    							.append("span")
	    							.text(d=>d.swimmer)

	    let swimming_pool=container.append("div")
	    				.attr("class","info swimming-pools")
	    				.append("ul")
	    					.selectAll("li")
	    					.data(swimmers)
	    					.enter()
	    						.append("li")
	    						.append("svg")
		    						.each(function(d){

		    							let box = this.getBoundingClientRect();
									    let WIDTH = options.width || box.width,
									        HEIGHT = options.height || box.height;

									    //console.log(WIDTH,HEIGHT)
									    let hscale=scaleLinear().domain([0,dimensions.length+dimensions.block*2]).range([0,WIDTH-(margins.left+margins.right)]),
											vscale=scaleLinear().domain([0,dimensions.step+dimensions.depth+dimensions.man_height]).range([0,HEIGHT-(margins.top+margins.bottom)]);

		    							new Swimmer(d,{
		    									svg:select(this),
		    									margins:margins,
		    									hscale:hscale,
		    									vscale:vscale,
		    									best_times:best_cumulative_times
		    							})
		    							new SwimmingPool({
		    									svg:select(this),
		    									margins:margins,
		    									hscale:hscale,
		    									vscale:vscale
		    							})
		    						})

	    let times=container.append("div")
	    				.attr("class","info swimmer-performances")
	    				.append("ul")
	    					.selectAll("li")
	    					.data(swimmers)
	    					.enter()
	    						.append("li")
	    							.append("span")
	    							.text(d=>d.value)
	}
}
function Swimmer(data,options) {
	console.log("Swimmer",data,options);

	let line = d3_line().curve(curveCardinal)

	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	let hscale=options.hscale,
		vscale=options.vscale;

   	let swimmer=options.svg
				.append("g")
				.attr("class","swimmer")
				.attr("transform",`translate(${margins.left},${margins.top})`)

	let water_line=dimensions.man_height+dimensions.step;
	let leg=swimmer.selectAll("g.leg")
						.data(data.splits)
						.enter()
						.append("g")
							.attr("rel",d=>("m"+d.distance))
							.attr("class",d=>("leg m"+d.distance))
							.append("path")
								.attr("d",d=>{

									//cumulative_time:distance==best_cumulative_time:x
									//x=distance*best_cumulative_time/cumulative_time
									

									d.mt=d.distance*options.best_times[d.distance].best/d.cumulative_time;
									d.dmt=d.distance-d.mt;
									console.log(d)

									if(d.distance%100>0) {
										//go
										return line([
												[hscale(dimensions.block),vscale(water_line)],
												[hscale(dimensions.block+dimensions.length-d.dmt),vscale(water_line)]
											]);
									} else {
										//back
										return line([
													[hscale(dimensions.length+dimensions.block),vscale(water_line)],
													[hscale(dimensions.block+d.dmt),vscale(water_line)]
												]);
									}
									
								})


}
function SwimmingPool(options) {

		//console.log("SwimmingPool",options)

		let hscale=options.hscale,
			vscale=options.vscale;

		let margins=options.margins || {left:0,top:0,right:0,bottom:0};

	   	let pool=options.svg
					.append("g")
					.attr("class","swimming-pool")
					.attr("transform",`translate(${margins.left},${margins.top})`)

		pool
			.append("g")
				.attr("class","water")
					.append("rect")
						.attr("x",hscale(dimensions.block))
						.attr("y",vscale(dimensions.step+dimensions.man_height))
						.attr("width",hscale(dimensions.length))
						.attr("height",vscale(dimensions.depth))

		pool.append("path")
				.attr("class","pool-line")
				.attr("d",()=>{
					return `M${hscale(0)},${vscale(dimensions.man_height)}
							
							l${hscale(dimensions.block)},0 
							
							l0,${vscale(dimensions.step)} 

							l0,${vscale(dimensions.depth)} 

							l${hscale(dimensions.length)},0 

							l0,${-vscale(dimensions.depth)} 

							l0,${-vscale(dimensions.step)}

							l${hscale(dimensions.block)},0 ` 
				});




}
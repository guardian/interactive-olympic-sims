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
	line as d3_line
} from 'd3-shape';
import Barchart from './Barchart';


import {cancelAnimFrame, requestAnimFrame} from '../lib/raf';

import {
	convertTimeHMS,
	convertTime,
	formatSecondsMilliseconds,
	getTimeForDistance
} from '../lib/time';

import {
	dimensions,
	CyclingEasing,
	CyclingLinear
} from '../lib/cycling'

import Velodrome from './Velodrome';

export default function TeamPursuit(data,options) {

	console.log("TeamPursuit",data.olympics.eventUnit.result.entrant);

	let yscales={},
		teams_data=[];

	let best_cumulative_times={};

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
    	
    	teams_data=data.olympics.eventUnit.result.entrant.map(entrant => {
    		let prev_cumulative_time=0;
    		return {
    			"team":entrant.country.identifier,
    			"splits":entrant.resultExtension[0].extension.filter((d,i)=>((+d.position<=4 && i%2===1)||(i>6))).map((d,i)=>{
    				let cumulative_time=convertTimeHMS(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;

    				if(entrant.country.identifier==="GBR") {
    					//console.log(d.value)
    				}

    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position*0.125
    				}
    				// return {
    				// 	value:d.value,
    				// 	time:convertTimeHMS(d.value),
    				// 	distance:+d.position*0.125
    				// }
    			}),
    			"kms":entrant.resultExtension[0].extension.filter((d,i)=>(+d.position<=4 && i%2===0)).map((d,i)=>{
    				let cumulative_time=convertTimeHMS(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;
    				return {
    					value:d.value,
    					time:lap_time,
    					cumulative_time:cumulative_time,
    					distance:+d.position
    				}
    			}),
    			"entrant":entrant
    		}
    	});

    	teams_data.forEach(team=>{
    		if(!best_cumulative_times[0]) {
				best_cumulative_times[0]={
					cumulative_times:[],
    				times:[]
				}
			}
			
    		team.splits.forEach(split=>{
    			if(!best_cumulative_times[split.distance]) {
    				best_cumulative_times[split.distance]={
    					cumulative_times:[],
    					times:[]
    				}
    			}
    			
    			best_cumulative_times[split.distance].times.push(split.time)
    			best_cumulative_times[split.distance].cumulative_times.push(split.cumulative_time)
    			

    		})
    	});

    	for(let distance in best_cumulative_times) {
    		best_cumulative_times[distance].best_time=d3_min(best_cumulative_times[distance].times);
    		best_cumulative_times[distance].best_cumulative=d3_min(best_cumulative_times[distance].cumulative_times);
    		best_cumulative_times[distance].times=best_cumulative_times[distance].times.sort((a,b)=>(a-b));
    		best_cumulative_times[distance].times=best_cumulative_times[distance].cumulative_times.sort((a,b)=>(a-b));
    	}

    	teams_data.forEach(s => {

			

			//s.splits=splits;


			s.splits.forEach(split => {

				let gap=split.cumulative_time-best_cumulative_times[split.distance].best_cumulative,
					text=(gap>0)?`+${formatSecondsMilliseconds(gap,2)}`:split.value;


				let distance=split.distance;

				split.mt=distance*best_cumulative_times[split.distance].best_cumulative/split.cumulative_time;
				split.dmt=distance-split.mt;

				options.text.push({
					"state":"annotation",
					"time":true,
					"mt":split.distance,//(LEGS.length-1)*dimensions.length,
					"lane":s.lane,
					"description":split.distance===0?split.value:text//,
					//"records":split.distance===LEGS[LEGS.length-1]?s.records:[]
				})	

			});
			
		})

    	console.log(teams_data)
		console.log(best_cumulative_times)



		//buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","team-pursuit")

	    let box = container.node().getBoundingClientRect();
	    let ratio = (85.73+25.0*2)/50,
	    	WIDTH = box.height*ratio,
	        HEIGHT = box.height;

	    if(WIDTH>box.width) {
	    	WIDTH=box.width;
	    	HEIGHT=WIDTH/ratio;
	    }

	    let svg=container
	    			.append("svg")
	    			.attr("width",WIDTH)
	    			.attr("height",HEIGHT)

	    
	    

	    let hscale=scaleLinear().domain([0,dimensions.radius*2+dimensions.field.width+dimensions.lane_width]).range([0,WIDTH-(margins.left+margins.right)]),
    		vscale=scaleLinear().domain([0,dimensions.field.height+dimensions.lane_width]).range([0,HEIGHT-(margins.top+margins.bottom)]);


	    let velodrome=new Velodrome({
	    	container:container,
	    	svg:svg,
	    	width:WIDTH,
	    	height:HEIGHT,
	    	margins:margins,
	    	multiplier:options.multiplier,
	    	hscale:hscale,
	    	vscale:vscale,
	    	splitCallback:((team,split)=>{
	    		updateTeam(team,split)
	    	})
	    })

	    teams_data.forEach((team,i) => {
	    	velodrome.addTeam(i,team);
	    })

	    let splits=teams_data[0].splits.map((s,i)=>{
	    	return {
	    		values:[
	    			s.value,
	    			teams_data[1].splits[i].value
	    		],
	    		times:[
	    			s.time,
	    			teams_data[1].splits[i].time
	    		],
	    		cumulative_times:[
	    			s.cumulative_time,
	    			teams_data[1].splits[i].cumulative_time
	    		],
	    		diff:s.cumulative_time - teams_data[1].splits[i].cumulative_time
	    	}
	    });
	    let barchart=new Barchart(splits,{
	    	container:container
	    })


	    let overlay=container.append("div")
	    				.attr("class","overlay")



	    let team=overlay.selectAll("div.team-info")
	    			.data(teams_data)
	    			.enter()
	    			.append("div")
	    				.attr("class","team-info")
	    				.classed("right",(d,i)=>(i===1))
	    				.classed("gold",d=>{
							if(!Array.isArray(d.entrant.property)) {
								return false;
							}
							return d.entrant.property.filter(p=>{
								return p.type=="Medal Awarded" && p.value==="Gold"
							})[0]
						})
						.classed("silver",d=>{
							if(!Array.isArray(d.entrant.property)) {
								return false;
							}
							return d.entrant.property.filter(p=>{
								return p.type=="Medal Awarded" && p.value==="Silver"
							})[0]
						})
	    				.style("top",(d,i)=>{
	    					return vscale(i?dimensions.field.height:dimensions.lane_width)+(i?-40-25:0-10)+"px"
	    				})
	    				.style("left",(d,i)=>{
	    					return hscale(dimensions.radius+dimensions.field.width/2)+"px"
	    				})
	    
	    let h3=team.append("h3");

		h3.append("b").text(d=>d.team)
	    let time=h3.append("span")




	    //velodrome.race();
	    velodrome.goTo(20)

	    
	    function updateTeam(team,split) {

	    	console.log("updateTeam",team,split)

	    	let times=[
	    			teams_data[0].splits[split],
	    			teams_data[1].splits[split]
	    		],
	    		_time=teams_data[team].splits[split].value,
	    		diff=times[team].cumulative_time-times[+!team].cumulative_time;


	    	if(diff>0) {
	    		_time="+"+formatSecondsMilliseconds(diff);
	    	}


	    	time.filter((d,i)=>(i===team)).html(_time+(" <i>"+((split+1)*125)+"m</i>"))



	    }
	}

	

}
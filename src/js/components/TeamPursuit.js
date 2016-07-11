import {
    select,
    selectAll
} from 'd3-selection';
import {
	scaleLinear
} from 'd3-scale';
import {
	max as d3_max,
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
	formatSecondsMilliseconds,
	getDistance
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
		teams=[];

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
    	
    	teams=data.olympics.eventUnit.result.entrant.map(entrant => {
    		let prev_cumulative_time=0;
    		return {
    			"team":entrant.country.identifier,
    			"splits":entrant.resultExtension[0].extension.filter((d,i)=>((+d.position<=4 && i%2===1)||(i>6))).map((d,i)=>{
    				let cumulative_time=convertTimeHMS(d.value),
    					lap_time=cumulative_time-prev_cumulative_time;
    				prev_cumulative_time=cumulative_time;
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

    	console.log(teams)
		
		buildVisual();

	}

	function buildVisual() {

    	let margins=options.margins || {left:0,top:0,right:0,bottom:0};

    	select(options.container)
    			.append("h1")
    			.text(options.title);
	    let container=select(options.container)
	    					.append("div")
	    					.attr("class","team-pursuit")

	    let svg=container
	    			.append("svg");

	    let box = svg.node().getBoundingClientRect();
	    let WIDTH = options.width || box.width,
	        HEIGHT = options.height || box.height;
	    

	    let hscale=scaleLinear().domain([0,dimensions.radius*2+dimensions.field.width]).range([0,WIDTH-(margins.left+margins.right)]),
    		vscale=scaleLinear().domain([0,dimensions.field.height]).range([0,HEIGHT-(margins.top+margins.bottom)]);


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

	    teams.forEach((team,i) => {
	    	velodrome.addTeam(i,team);
	    })

	    let splits=teams[0].splits.map((s,i)=>{
	    	return {
	    		values:[
	    			s.value,
	    			teams[1].splits[i].value
	    		],
	    		times:[
	    			s.time,
	    			teams[1].splits[i].time
	    		],
	    		cumulative_times:[
	    			s.cumulative_time,
	    			teams[1].splits[i].cumulative_time
	    		],
	    		diff:s.cumulative_time - teams[1].splits[i].cumulative_time
	    	}
	    });
	    let barchart=new Barchart(splits,{
	    	container:container
	    })


	    let overlay=container.append("div")
	    				.attr("class","overlay")

	    let team=overlay.selectAll("div.team-info")
	    			.data(teams)
	    			.enter()
	    			.append("div")
	    				.attr("class","team-info")
	    				.classed("right",(d,i)=>(i===1))
	    				.style("top",(d,i)=>{
	    					return vscale(i?dimensions.field.height:dimensions.lane_width)+(i?-20:0)+"px"
	    				})
	    				.style("left",(d,i)=>{
	    					return hscale(dimensions.radius+dimensions.field.width/2)+"px"
	    				})
	    
	    let time=team.append("h3")
	    			.text(d=>d.team)
	    			.append("span")




	    velodrome.race();

	    
	    function updateTeam(team,split) {

	    	console.log("updateTeam",team,split)

	    	let times=[
	    			teams[0].splits[split],
	    			teams[1].splits[split]
	    		],
	    		_time=teams[team].splits[split].value,
	    		diff=times[team].cumulative_time-times[+!team].cumulative_time;


	    	if(diff>0) {
	    		_time="+"+formatSecondsMilliseconds(diff);
	    	}


	    	time.filter((d,i)=>(i===team)).html(_time+(" <i>"+((split+1)*125)+"m</i>"))



	    }
	}

	

}